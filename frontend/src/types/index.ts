export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  triggers: string[];
  path: string;
  enabled: boolean;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skillUsed?: string;
}

export interface IntentInfo {
  type: 'question' | 'task' | 'conversation' | 'multi_step_task';
  description: string;
  requiresPlanning: boolean;
  estimatedSteps: number;
}

export interface PlanStep {
  id: string;
  description: string;
  type: 'skill' | 'llm' | 'condition';
  skillName?: string;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
}

export interface PlanInfo {
  goal: string;
  steps: PlanStep[];
}

export interface StatusMessage {
  stage: 'intent_recognition' | 'planning' | 'skill_matched' | 'thinking' | 'replanning' | 'generating' | 'matching' | 'matched' | 'loading' | 'executing' | 'completed' | 'error';
  message: string;
  skillName?: string;
  skillDescription?: string;
  icon: 'search' | 'check' | 'loading' | 'execute' | 'done' | 'error' | 'thinking' | 'brain' | 'plan' | 'replan' | 'generating';
}

export interface WebSocketMessage {
  type: 'chat' | 'skill_list' | 'skill_loaded' | 'skill_executing' | 'skill_result' | 'error' | 'config_update' | 'status' | 'intent' | 'plan' | 'plan_complete' | 'step_start' | 'step_complete' | 'step_error' | 'stream';
  payload: any;
}

export interface LLMConfig {
  provider: 'openai' | 'ollama' | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelConfig extends LLMConfig {
  name: string;
  isDefault: boolean;
}

export interface SystemConfig {
  llm: LLMConfig;
  models: ModelConfig[];
  language: string;
  skillsPath: string;
}
