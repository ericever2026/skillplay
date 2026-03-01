import { LLMConfig, ChatMessage } from '../types.ts';
import { configService } from './config-service.ts';

export type StreamCallback = (chunk: string) => void;

const PROVIDER_CONFIGS: Record<string, { baseUrl: string; defaultModel: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', defaultModel: 'gpt-3.5-turbo' },
  deepseek: { baseUrl: 'https://api.deepseek.com', defaultModel: 'deepseek-chat' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', defaultModel: 'glm-4' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', defaultModel: 'qwen-turbo' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', defaultModel: 'moonshot-v1-8k' },
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', defaultModel: 'doubao-pro-4k' },
  wenxin: { baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', defaultModel: 'ernie-bot-4' },
  spark: { baseUrl: 'https://spark-api-open.xf-yun.com/v1', defaultModel: 'generalv3.5' },
  ollama: { baseUrl: 'http://localhost:11434', defaultModel: 'llama2' },
  custom: { baseUrl: '', defaultModel: '' }
};

export class LLMService {
  private config: LLMConfig;

  constructor() {
    this.config = configService.getLLMConfig();
  }

  updateConfig(config: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);
    
    if (this.config.provider === 'ollama') {
      return this.chatWithOllama(formattedMessages);
    }
    
    return this.chatWithOpenAI(formattedMessages);
  }

  async chatStream(messages: ChatMessage[], onChunk: StreamCallback, systemPrompt?: string): Promise<string> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);
    
    if (this.config.provider === 'ollama') {
      return this.chatStreamWithOllama(formattedMessages, onChunk);
    }
    
    return this.chatStreamWithOpenAI(formattedMessages, onChunk);
  }

  private getBaseUrl(): string {
    if (this.config.baseUrl) {
      return this.config.baseUrl;
    }
    return PROVIDER_CONFIGS[this.config.provider]?.baseUrl || 'https://api.openai.com/v1';
  }

  private formatMessages(messages: ChatMessage[], systemPrompt?: string): Array<{role: string; content: string}> {
    const formatted: Array<{role: string; content: string}> = [];
    
    if (systemPrompt) {
      formatted.push({ role: 'system', content: systemPrompt });
    }
    
    for (const msg of messages) {
      formatted.push({
        role: msg.role,
        content: msg.content
      });
    }
    
    return formatted;
  }

  private async chatWithOpenAI(messages: Array<{role: string; content: string}>): Promise<string> {
    const baseUrl = this.getBaseUrl();
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatStreamWithOpenAI(messages: Array<{role: string; content: string}>, onChunk: StreamCallback): Promise<string> {
    const baseUrl = this.getBaseUrl();
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${error}`);
    }

    return this.parseStreamResponse(response, onChunk);
  }

  private async parseStreamResponse(response: Response, onChunk: StreamCallback): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
          
          if (trimmedLine.startsWith('data: ')) {
            try {
              const jsonStr = trimmedLine.slice(6);
              const data = JSON.parse(jsonStr);
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async chatWithOllama(messages: Array<{role: string; content: string}>): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 2048
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    return data.message.content;
  }

  private async chatStreamWithOllama(messages: Array<{role: string; content: string}>, onChunk: StreamCallback): Promise<string> {
    const baseUrl = this.config.baseUrl || 'http://localhost:11434';
    
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        stream: true,
        options: {
          temperature: this.config.temperature || 0.7,
          num_predict: this.config.maxTokens || 2048
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    return this.parseOllamaStreamResponse(response, onChunk);
  }

  private async parseOllamaStreamResponse(response: Response, onChunk: StreamCallback): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const content = data.message?.content;
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  }

  private async chatWithCustom(messages: Array<{role: string; content: string}>): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error('Custom provider requires baseUrl to be configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatStreamWithCustom(messages: Array<{role: string; content: string}>, onChunk: StreamCallback): Promise<string> {
    if (!this.config.baseUrl) {
      throw new Error('Custom provider requires baseUrl to be configured');
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: messages,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 2048,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Custom API error: ${error}`);
    }

    return this.parseStreamResponse(response, onChunk);
  }

  getConfig(): LLMConfig {
    return { ...this.config };
  }
}

export const llmService = new LLMService();
