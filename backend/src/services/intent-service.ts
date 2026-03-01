import { llmService } from './llm-service.ts';
import { skillService } from './skill-service.ts';

export interface Intent {
  type: 'question' | 'task' | 'conversation' | 'multi_step_task';
  description: string;
  entities: Record<string, string>;
  confidence: number;
  requiresPlanning: boolean;
  estimatedSteps: number;
}

export interface IntentRecognitionResult {
  intent: Intent;
  rawInput: string;
  timestamp: number;
}

export class IntentService {
  
  async recognizeIntent(userInput: string): Promise<IntentRecognitionResult> {
    const skills = skillService.getSkillsMetadata();
    const skillDescriptions = skills.map(s => `- ${s.name}: ${s.description}`).join('\n');
    
    const prompt = `分析用户输入的意图，返回JSON格式的意图分析结果。

可用技能列表：
${skillDescriptions}

用户输入：${userInput}

请分析并返回以下JSON格式（只返回JSON，不要其他内容）：
{
  "type": "question|task|conversation|multi_step_task",
  "description": "意图描述",
  "entities": {"key": "value"},
  "confidence": 0.0-1.0,
  "requiresPlanning": true/false,
  "estimatedSteps": 数字
}

类型说明：
- question: 简单问题，直接回答即可
- task: 单一任务，可能需要调用一个技能
- conversation: 日常对话，无需特殊处理
- multi_step_task: 多步骤任务，需要规划执行

判断requiresPlanning的标准：
- 如果需要多个技能配合，设为true
- 如果需要多个步骤才能完成，设为true
- 简单问答设为false`;

    try {
      const response = await llmService.chat([
        { role: 'user', content: prompt }
      ], '你是一个意图识别专家，擅长分析用户输入并提取结构化信息。');
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const intent: Intent = JSON.parse(jsonMatch[0]);
        return {
          intent,
          rawInput: userInput,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('[Intent Service] Recognition error:', error);
    }

    return {
      intent: {
        type: 'conversation',
        description: userInput,
        entities: {},
        confidence: 0.5,
        requiresPlanning: false,
        estimatedSteps: 1
      },
      rawInput: userInput,
      timestamp: Date.now()
    };
  }

  needsSkill(intent: Intent): boolean {
    return intent.type === 'task' || intent.type === 'multi_step_task';
  }

  isMultiStep(intent: Intent): boolean {
    return intent.type === 'multi_step_task' || intent.requiresPlanning;
  }
}

export const intentService = new IntentService();
