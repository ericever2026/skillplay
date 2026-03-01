import { WebSocket } from 'ws';
import { intentService, Intent, IntentRecognitionResult } from './intent-service.ts';
import { plannerService, Plan, PlanStep } from './planner-service.ts';
import { skillService } from './skill-service.ts';
import { llmService } from './llm-service.ts';

export interface ExecutionContext {
  userInput: string;
  conversationHistory: string[];
  intent: Intent | null;
  plan: Plan | null;
  currentStep: number;
  results: string[];
  status: 'initialized' | 'recognizing' | 'planning' | 'executing' | 'replanning' | 'completed' | 'failed';
}

export interface ExecutionUpdate {
  type: 'intent' | 'plan' | 'step_start' | 'step_progress' | 'step_complete' | 'step_error' | 'replan' | 'plan_complete' | 'generating' | 'complete' | 'stream';
  data: any;
}

export type StatusCallback = (update: ExecutionUpdate) => void;

export class ExecutorService {
  
  async execute(
    userInput: string,
    context: string[],
    onStatus: StatusCallback,
    shouldStop?: () => boolean
  ): Promise<string> {
    const execContext: ExecutionContext = {
      userInput,
      conversationHistory: context,
      intent: null,
      plan: null,
      currentStep: 0,
      results: [],
      status: 'initialized'
    };

    try {
      if (shouldStop?.()) return '';

      onStatus({
        type: 'step_progress',
        data: { stage: 'intent_recognition', message: '🔍 正在识别意图...' }
      });

      execContext.status = 'recognizing';
      const intentResult = await intentService.recognizeIntent(userInput);
      
      if (shouldStop?.()) return '';
      
      execContext.intent = intentResult.intent;
      
      onStatus({
        type: 'intent',
        data: {
          type: intentResult.intent.type,
          description: intentResult.intent.description,
          requiresPlanning: intentResult.intent.requiresPlanning,
          estimatedSteps: intentResult.intent.estimatedSteps
        }
      });

      console.log(`[Executor] Intent recognized: ${intentResult.intent.type} - ${intentResult.intent.description}`);

      if (shouldStop?.()) return '';

      if (intentResult.intent.requiresPlanning || intentResult.intent.type === 'multi_step_task') {
        onStatus({
          type: 'step_progress',
          data: { stage: 'planning', message: '📋 正在制定执行计划...' }
        });

        execContext.status = 'planning';
        execContext.plan = await plannerService.createPlan(intentResult.intent, userInput);
        
        if (shouldStop?.()) return '';
        
        const skillSteps = execContext.plan.steps.filter(s => s.type === 'skill' && s.skillName);
        for (const step of skillSteps) {
          const skillMeta = skillService.getSkillsMetadata().find(s => s.name === step.skillName);
          if (skillMeta) {
            onStatus({
              type: 'step_progress',
              data: {
                stage: 'skill_matched',
                message: `✅ 匹配到技能: ${step.skillName}`,
                skillName: step.skillName,
                skillDescription: skillMeta.description
              }
            });
          }
        }
        
        onStatus({
          type: 'plan',
          data: {
            goal: execContext.plan.goal,
            steps: execContext.plan.steps.map((s, i) => ({
              id: s.id,
              description: s.description,
              type: s.type,
              skillName: s.skillName
            }))
          }
        });

        console.log(`[Executor] Plan created with ${execContext.plan.steps.length} steps`);

        execContext.status = 'executing';
        return await this.executePlan(execContext, onStatus, shouldStop);
        
      } else {
        if (shouldStop?.()) return '';
        
        const matchedSkill = skillService.matchSkill(userInput);
        
        if (matchedSkill) {
          onStatus({
            type: 'step_progress',
            data: { 
              stage: 'skill_matched', 
              message: `✅ 匹配到技能: ${matchedSkill.name}`,
              skillName: matchedSkill.name,
              skillDescription: matchedSkill.description
            }
          });

          onStatus({
            type: 'step_start',
            data: { stepId: 'skill-0', description: `执行技能: ${matchedSkill.name}`, type: 'skill', skillName: matchedSkill.name }
          });

          const result = await skillService.executeSkill(matchedSkill.name, userInput, context);
          
          if (result.success) {
            onStatus({
              type: 'step_complete',
              data: { stepId: 'skill-0', result: result.result, executionTime: result.executionTime }
            });

            onStatus({
              type: 'generating',
              data: { message: '📝 正在生成回答...' }
            });

            return result.result;
          } else {
            onStatus({
              type: 'step_error',
              data: { stepId: 'skill-0', error: result.error }
            });
            return `技能执行失败: ${result.error}`;
          }
        } else {
          onStatus({
            type: 'step_progress',
            data: { stage: 'thinking', message: '🧠 正在思考中...' }
          });

          const response = await llmService.chatStream(
            [
              ...context.map(msg => ({ role: 'user' as const, content: msg })),
              { role: 'user' as const, content: userInput }
            ],
            (chunk) => {
              onStatus({
                type: 'stream',
                data: { chunk }
              });
            }
          );
          
          return response;
        }
      }
    } catch (error) {
      execContext.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      onStatus({
        type: 'step_error',
        data: { error: errorMsg }
      });
      return `执行失败: ${errorMsg}`;
    }
  }

  private async executePlan(
    context: ExecutionContext,
    onStatus: StatusCallback,
    shouldStop?: () => boolean
  ): Promise<string> {
    if (!context.plan) {
      return '没有可执行的计划';
    }

    let currentPlan = context.plan;
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      if (shouldStop?.()) return '';
      
      iteration++;
      
      const currentStep = plannerService.getCurrentStep(currentPlan);
      if (!currentStep) {
        currentPlan.status = 'completed';
        break;
      }

      if (currentStep.type === 'skill' && currentStep.skillName) {
        const skillMeta = skillService.getSkillsMetadata().find(s => s.name === currentStep.skillName);
        if (skillMeta) {
          onStatus({
            type: 'step_progress',
            data: {
              stage: 'skill_matched',
              message: `✅ 匹配到技能: ${currentStep.skillName}`,
              skillName: currentStep.skillName,
              skillDescription: skillMeta.description
            }
          });
        }
      }

      onStatus({
        type: 'step_start',
        data: {
          stepId: currentStep.id,
          description: currentStep.description,
          type: currentStep.type,
          skillName: currentStep.skillName
        }
      });

      console.log(`[Executor] Executing step ${currentPlan.currentStepIndex + 1}/${currentPlan.steps.length}: ${currentStep.description}`);

      currentPlan = plannerService.updateStepStatus(currentPlan, currentStep.id, 'running');

      try {
        if (shouldStop?.()) return '';
        
        const result = await this.executeStep(currentStep, context);
        
        if (shouldStop?.()) return '';
        
        currentPlan = plannerService.updateStepStatus(currentPlan, currentStep.id, 'completed', result);
        context.results.push(result);
        
        onStatus({
          type: 'step_complete',
          data: { stepId: currentStep.id, result }
        });

        currentPlan = plannerService.advanceStep(currentPlan);
        
      } catch (error) {
        if (shouldStop?.()) return '';
        
        const errorMsg = error instanceof Error ? error.message : String(error);
        currentPlan = plannerService.updateStepStatus(currentPlan, currentStep.id, 'failed', undefined, errorMsg);
        
        onStatus({
          type: 'step_error',
          data: { stepId: currentStep.id, error: errorMsg }
        });

        const shouldReplan = await plannerService.shouldReplan({
          originalPlan: currentPlan,
          failedStep: currentStep,
          error: errorMsg,
          executedSteps: currentPlan.steps.slice(0, currentPlan.currentStepIndex)
        });

        if (shouldReplan.needReplan) {
          if (shouldStop?.()) return '';
          
          onStatus({
            type: 'replan',
            data: { reason: shouldReplan.reason }
          });

          onStatus({
            type: 'step_progress',
            data: { stage: 'replanning', message: '🔄 正在重新规划...' }
          });

          currentPlan = await plannerService.replan(currentPlan, {
            originalPlan: currentPlan,
            failedStep: currentStep,
            error: errorMsg,
            executedSteps: currentPlan.steps.slice(0, currentPlan.currentStepIndex)
          });
          currentPlan.status = 'executing';
          continue;
        } else {
          currentPlan.status = 'failed';
          return `执行失败: ${errorMsg}`;
        }
      }
    }

    if (shouldStop?.()) return '';

    if (iteration >= maxIterations) {
      return '执行超时：达到最大迭代次数';
    }

    onStatus({
      type: 'plan_complete',
      data: { results: context.results }
    });

    onStatus({
      type: 'generating',
      data: { message: '📝 正在生成回答...' }
    });

    if (context.results.length > 0) {
      const finalResult = context.results[context.results.length - 1];
      return this.summarizeResults(context.results, context.userInput, onStatus, shouldStop);
    }
    
    return '任务完成，但没有产生结果';
  }

  private async executeStep(step: PlanStep, context: ExecutionContext): Promise<string> {
    switch (step.type) {
      case 'skill':
        if (!step.skillName) {
          throw new Error('Skill step missing skillName');
        }
        const result = await skillService.executeSkill(
          step.skillName,
          step.input || context.userInput,
          context.conversationHistory
        );
        if (!result.success) {
          throw new Error(result.error || 'Skill execution failed');
        }
        return result.result;

      case 'llm':
        const response = await llmService.chat([
          ...context.conversationHistory.map(msg => ({ role: 'user' as const, content: msg })),
          { role: 'user' as const, content: step.input || context.userInput }
        ]);
        return response;

      case 'condition':
        throw new Error('Condition steps not yet implemented');

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async summarizeResults(results: string[], originalInput: string, onStatus?: StatusCallback, shouldStop?: () => boolean): Promise<string> {
    if (results.length === 1) {
      return results[0];
    }

    const prompt = `请总结以下执行结果，回答用户的原始问题。

用户原始输入：${originalInput}

执行结果：
${results.map((r, i) => `步骤${i + 1}: ${r}`).join('\n\n')}

请给出一个完整、连贯的回答：`;

    try {
      return await llmService.chatStream(
        [{ role: 'user', content: prompt }],
        (chunk) => {
          if (shouldStop?.()) return;
          if (onStatus) {
            onStatus({
              type: 'stream',
              data: { chunk }
            });
          }
        }
      );
    } catch {
      return results.join('\n\n');
    }
  }
}

export const executorService = new ExecutorService();
