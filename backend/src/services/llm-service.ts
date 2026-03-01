import { LLMConfig, ChatMessage } from '../types.ts';
import { configService } from './config-service.ts';

export type StreamCallback = (chunk: string) => void;

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
    
    switch (this.config.provider) {
      case 'openai':
        return this.chatWithOpenAI(formattedMessages);
      case 'ollama':
        return this.chatWithOllama(formattedMessages);
      case 'custom':
        return this.chatWithCustom(formattedMessages);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  async chatStream(messages: ChatMessage[], onChunk: StreamCallback, systemPrompt?: string): Promise<string> {
    const formattedMessages = this.formatMessages(messages, systemPrompt);
    
    switch (this.config.provider) {
      case 'openai':
        return this.chatStreamWithOpenAI(formattedMessages, onChunk);
      case 'ollama':
        return this.chatStreamWithOllama(formattedMessages, onChunk);
      case 'custom':
        return this.chatStreamWithCustom(formattedMessages, onChunk);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
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
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    
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
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async chatStreamWithOpenAI(messages: Array<{role: string; content: string}>, onChunk: StreamCallback): Promise<string> {
    const baseUrl = this.config.baseUrl || 'https://api.openai.com/v1';
    
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
      throw new Error(`OpenAI API error: ${error}`);
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
