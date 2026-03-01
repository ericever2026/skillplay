import { ConversationContext, ChatMessage } from '../types.ts';
import { randomUUID } from 'crypto';

export class ConversationService {
  private conversations: Map<string, ConversationContext> = new Map();
  private maxContextLength: number = 20;

  createConversation(): ConversationContext {
    const id = randomUUID();
    const conversation: ConversationContext = {
      id,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  getConversation(id: string): ConversationContext | undefined {
    return this.conversations.get(id);
  }

  addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, skillUsed?: string): ChatMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const message: ChatMessage = {
      role,
      content,
      timestamp: Date.now(),
      skillUsed
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    if (conversation.messages.length > this.maxContextLength) {
      const keepSystemMessages = conversation.messages.filter(m => m.role === 'system');
      const recentMessages = conversation.messages.filter(m => m.role !== 'system').slice(-this.maxContextLength + keepSystemMessages.length);
      conversation.messages = [...keepSystemMessages, ...recentMessages];
    }

    return message;
  }

  getContextMessages(conversationId: string): ChatMessage[] {
    const conversation = this.conversations.get(conversationId);
    return conversation ? [...conversation.messages] : [];
  }

  getContextString(conversationId: string, maxLength: number = 5): string[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    const recentMessages = conversation.messages.slice(-maxLength * 2);
    return recentMessages.map(m => `${m.role}: ${m.content}`);
  }

  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
  }

  getAllConversations(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }
}

export const conversationService = new ConversationService();
