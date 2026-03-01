export interface SkillMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  triggers: string[];
  path: string;
  enabled: boolean;
}

export interface SkillConfig {
  name: string;
  description: string;
  version: string;
  author: string;
  triggers: string[];
  main: string;
  enabled?: boolean;
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

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  skillUsed?: string;
}

export interface ConversationContext {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface StatusMessage {
  stage: 'matching' | 'matched' | 'loading' | 'executing' | 'completed' | 'error' | 'thinking';
  message: string;
  skillName?: string;
  skillDescription?: string;
  icon: 'search' | 'check' | 'loading' | 'execute' | 'done' | 'error' | 'thinking';
}

export interface WebSocketMessage {
  type: 'chat' | 'skill_list' | 'skill_loaded' | 'skill_executing' | 'skill_result' | 'error' | 'config_update' | 'status' | 'stream';
  payload: any;
}

export interface SkillExecutionResult {
  success: boolean;
  result: string;
  error?: string;
  executionTime: number;
}
