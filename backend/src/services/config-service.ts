import { SystemConfig, LLMConfig, ModelConfig } from '../types.ts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = join(__dirname, '../../../config/llm-config.json');

const defaultModel: ModelConfig = {
  name: 'DeepSeek',
  provider: 'openai',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
  isDefault: true
};

const defaultLLMConfig: LLMConfig = {
  provider: 'openai',
  model: 'deepseek-chat',
  baseUrl: 'https://api.deepseek.com',
  temperature: 0.7,
  maxTokens: 2048
};

const defaultConfig: SystemConfig = {
  llm: defaultLLMConfig,
  models: [defaultModel],
  language: 'zh-CN',
  skillsPath: join(__dirname, '../../../skills')
};

export class ConfigService {
  private config: SystemConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): SystemConfig {
    try {
      if (existsSync(CONFIG_PATH)) {
        const content = readFileSync(CONFIG_PATH, 'utf-8');
        const userConfig = JSON.parse(content) as Partial<SystemConfig>;
        return {
          ...defaultConfig,
          ...userConfig,
          llm: { ...defaultLLMConfig, ...userConfig.llm },
          models: userConfig.models || [defaultModel],
          language: userConfig.language || 'zh-CN'
        };
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
    return defaultConfig;
  }

  getConfig(): SystemConfig {
    return this.config;
  }

  getLLMConfig(): LLMConfig {
    return this.config.llm;
  }

  getModels(): ModelConfig[] {
    return this.config.models || [];
  }

  getDefaultModel(): ModelConfig | undefined {
    return this.config.models?.find(m => m.isDefault);
  }

  getLanguage(): string {
    return this.config.language || 'zh-CN';
  }

  updateLLMConfig(llmConfig: Partial<LLMConfig>): void {
    this.config.llm = { ...this.config.llm, ...llmConfig };
    this.saveConfig();
  }

  updateModels(models: ModelConfig[]): void {
    this.config.models = models;
    const defaultModel = models.find(m => m.isDefault);
    if (defaultModel) {
      this.config.llm = {
        provider: defaultModel.provider,
        model: defaultModel.model,
        apiKey: defaultModel.apiKey,
        baseUrl: defaultModel.baseUrl,
        temperature: defaultModel.temperature,
        maxTokens: defaultModel.maxTokens
      };
    }
    this.saveConfig();
  }

  updateLanguage(language: string): void {
    this.config.language = language;
    this.saveConfig();
  }

  private saveConfig(): void {
    try {
      writeFileSync(CONFIG_PATH, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  getSkillsPath(): string {
    return this.config.skillsPath;
  }
}

export const configService = new ConfigService();
