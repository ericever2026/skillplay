import { llmService } from './llm-service.ts';
import { skillService } from './skill-service.ts';
import { Intent } from './intent-service.ts';

export interface PlanStep {
  id: string;
  type: 'skill' | 'llm' | 'condition' | 'loop';
  description: string;
  skillName?: string;
  input?: string;
  condition?: string;
  subSteps?: PlanStep[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  currentStepIndex: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'replanning';
  createdAt: number;
  updatedAt: number;
}

export interface ReplanContext {
  originalPlan: Plan;
  failedStep: PlanStep;
  error: string;
  executedSteps: PlanStep[];
}

export class PlannerService {
  
  async createPlan(intent: Intent, userInput: string): Promise<Plan> {
    const skills = skillService.getSkillsMetadata();
    const skillInfo = skills.map(s => ({
      name: s.name,
      description: s.description,
      triggers: s.triggers
    }));

    const prompt = `根据用户意图创建执行计划。

用户输入：${userInput}
意图类型：${intent.type}
意图描述：${intent.description}
提取实体：${JSON.stringify(intent.entities)}
预估步骤数：${intent.estimatedSteps}

可用技能：
${JSON.stringify(skillInfo, null, 2)}

请创建执行计划，返回JSON格式（只返回JSON）：
{
  "steps": [
    {
      "type": "skill|llm|condition",
      "description": "步骤描述",
      "skillName": "技能名称(如果type是skill)",
      "input": "输入内容模板，可用{entity}引用实体"
    }
  ]
}

规划原则：
1. 每个步骤应该明确、可执行
2. 如果需要调用技能，使用skill类型
3. 如果需要LLM处理，使用llm类型
4. 如果需要条件判断，使用condition类型
5. 步骤之间应该有逻辑顺序`;

    try {
      const response = await llmService.chat([
        { role: 'user', content: prompt }
      ], '你是一个任务规划专家，擅长将复杂任务分解为可执行的步骤。');
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);
        const plan: Plan = {
          id: `plan-${Date.now()}`,
          goal: intent.description,
          steps: planData.steps.map((step: any, index: number) => ({
            id: `step-${index}`,
            ...step,
            status: 'pending'
          })),
          currentStepIndex: 0,
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return plan;
      }
    } catch (error) {
      console.error('[Planner Service] Planning error:', error);
    }

    return this.createDefaultPlan(userInput);
  }

  private createDefaultPlan(userInput: string): Plan {
    const matchedSkill = skillService.matchSkill(userInput);
    
    const steps: PlanStep[] = matchedSkill ? [
      {
        id: 'step-0',
        type: 'skill',
        description: `执行技能: ${matchedSkill.name}`,
        skillName: matchedSkill.name,
        input: userInput,
        status: 'pending'
      }
    ] : [
      {
        id: 'step-0',
        type: 'llm',
        description: '使用大模型回答',
        input: userInput,
        status: 'pending'
      }
    ];

    return {
      id: `plan-${Date.now()}`,
      goal: userInput,
      steps,
      currentStepIndex: 0,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  async shouldReplan(context: ReplanContext): Promise<{ needReplan: boolean; reason: string }> {
    const prompt = `判断是否需要重新规划任务。

原始目标：${context.originalPlan.goal}
失败的步骤：${context.failedStep.description}
错误信息：${context.error}
已完成的步骤：${context.executedSteps.filter(s => s.status === 'completed').map(s => s.description).join(', ')}

请判断是否需要重新规划，返回JSON：
{
  "needReplan": true/false,
  "reason": "原因说明"
}`;

    try {
      const response = await llmService.chat([
        { role: 'user', content: prompt }
      ], '你是一个任务执行监控专家，擅长判断任务执行状态。');
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[Planner Service] Replan decision error:', error);
    }

    return { needReplan: false, reason: '无法判断，继续执行' };
  }

  async replan(originalPlan: Plan, context: ReplanContext): Promise<Plan> {
    const prompt = `根据执行情况重新规划任务。

原始目标：${originalPlan.goal}
失败的步骤：${context.failedStep.description}
错误信息：${context.error}
已完成的步骤：${context.executedSteps.filter(s => s.status === 'completed').map(s => s.description).join(', ')}

请创建新的执行计划，返回JSON格式：
{
  "steps": [
    {
      "type": "skill|llm",
      "description": "步骤描述",
      "skillName": "技能名称(如果type是skill)",
      "input": "输入内容"
    }
  ]
}`;

    try {
      const response = await llmService.chat([
        { role: 'user', content: prompt }
      ], '你是一个任务规划专家，擅长根据执行情况调整计划。');
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const planData = JSON.parse(jsonMatch[0]);
        return {
          ...originalPlan,
          id: `plan-${Date.now()}`,
          steps: planData.steps.map((step: any, index: number) => ({
            id: `step-${index}`,
            ...step,
            status: 'pending'
          })),
          currentStepIndex: 0,
          status: 'replanning',
          updatedAt: Date.now()
        };
      }
    } catch (error) {
      console.error('[Planner Service] Replan error:', error);
    }

    return originalPlan;
  }

  getCurrentStep(plan: Plan): PlanStep | null {
    if (plan.currentStepIndex < plan.steps.length) {
      return plan.steps[plan.currentStepIndex];
    }
    return null;
  }

  advanceStep(plan: Plan): Plan {
    const newPlan = { ...plan };
    newPlan.currentStepIndex++;
    newPlan.updatedAt = Date.now();
    
    if (newPlan.currentStepIndex >= newPlan.steps.length) {
      newPlan.status = 'completed';
    }
    
    return newPlan;
  }

  updateStepStatus(plan: Plan, stepId: string, status: PlanStep['status'], result?: string, error?: string): Plan {
    const newPlan = { ...plan };
    const step = newPlan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      step.result = result;
      step.error = error;
    }
    newPlan.updatedAt = Date.now();
    return newPlan;
  }
}

export const plannerService = new PlannerService();
