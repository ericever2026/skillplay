import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '../types.ts';
import { skillService } from '../services/skill-service.ts';
import { llmService } from '../services/llm-service.ts';
import { conversationService } from '../services/conversation-service.ts';
import { configService } from '../services/config-service.ts';
import { executorService, ExecutionUpdate } from '../services/executor-service.ts';

export function setupWebSocket(wss: WebSocketServer) {
  console.log('[WebSocket] Server initialized');

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] Client connected');
    
    const conversation = conversationService.createConversation();
    let shouldStop = false;
    
    sendMessage(ws, {
      type: 'skill_list',
      payload: {
        conversationId: conversation.id,
        skills: skillService.getSkillsMetadata()
      }
    });

    sendMessage(ws, {
      type: 'config_update',
      payload: { config: llmService.getConfig() }
    });

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        if (message.type === 'stop') {
          shouldStop = true;
          return;
        }
        await handleMessage(ws, message, conversation.id, () => shouldStop);
      } catch (error) {
        console.error('[WebSocket] Message handling error:', error);
        sendMessage(ws, {
          type: 'error',
          payload: { message: 'Failed to process message' }
        });
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      shouldStop = true;
      conversationService.clearConversation(conversation.id);
    });
  });
}

async function handleMessage(ws: WebSocket, message: WebSocketMessage, conversationId: string, shouldStop: () => boolean) {
  switch (message.type) {
    case 'chat':
      await handleChat(ws, message.payload, conversationId, shouldStop);
      break;
    case 'config_update':
      handleConfigUpdate(ws, message.payload);
      break;
    default:
      sendMessage(ws, {
        type: 'error',
        payload: { message: `Unknown message type: ${message.type}` }
      });
  }
}

async function handleChat(ws: WebSocket, payload: { content: string }, conversationId: string, shouldStop: () => boolean) {
  conversationService.addMessage(conversationId, 'user', payload.content);

  const onStatus = (update: ExecutionUpdate) => {
    console.log(`[Executor Update] ${update.type}:`, update.data);
    
    switch (update.type) {
      case 'step_progress':
        sendMessage(ws, {
          type: 'status',
          payload: {
            stage: update.data.stage,
            message: update.data.message,
            skillName: update.data.skillName,
            skillDescription: update.data.skillDescription,
            icon: getIconForStage(update.data.stage)
          }
        });
        break;

      case 'intent':
        sendMessage(ws, {
          type: 'intent',
          payload: {
            type: update.data.type,
            description: update.data.description,
            requiresPlanning: update.data.requiresPlanning,
            estimatedSteps: update.data.estimatedSteps
          }
        });
        break;

      case 'plan':
        sendMessage(ws, {
          type: 'plan',
          payload: {
            goal: update.data.goal,
            steps: update.data.steps
          }
        });
        break;

      case 'step_start':
        sendMessage(ws, {
          type: 'step_start',
          payload: {
            stepId: update.data.stepId,
            description: update.data.description,
            stepType: update.data.type,
            skillName: update.data.skillName
          }
        });
        break;

      case 'step_complete':
        sendMessage(ws, {
          type: 'step_complete',
          payload: {
            stepId: update.data.stepId,
            result: update.data.result,
            executionTime: update.data.executionTime
          }
        });
        break;

      case 'step_error':
        sendMessage(ws, {
          type: 'step_error',
          payload: {
            stepId: update.data.stepId,
            error: update.data.error
          }
        });
        break;

      case 'replan':
        sendMessage(ws, {
          type: 'status',
          payload: {
            stage: 'replanning',
            message: `🔄 重新规划: ${update.data.reason}`,
            icon: 'replan'
          }
        });
        break;

      case 'plan_complete':
        sendMessage(ws, {
          type: 'plan_complete',
          payload: {
            results: update.data.results
          }
        });
        break;

      case 'generating':
        sendMessage(ws, {
          type: 'status',
          payload: {
            stage: 'generating',
            message: update.data.message,
            icon: 'generating'
          }
        });
        break;

      case 'stream':
        sendMessage(ws, {
          type: 'stream',
          payload: {
            chunk: update.data.chunk
          }
        });
        break;

      case 'complete':
        sendMessage(ws, {
          type: 'status',
          payload: {
            stage: 'completed',
            message: '✨ 任务执行完成',
            icon: 'done'
          }
        });
        break;
    }
  };

  const context = conversationService.getContextString(conversationId, 5);
  
  if (shouldStop()) {
    return;
  }
  
  const response = await executorService.execute(payload.content, context, onStatus, shouldStop);

  if (shouldStop()) {
    return;
  }

  const assistantMessage = conversationService.addMessage(
    conversationId,
    'assistant',
    response
  );

  sendMessage(ws, {
    type: 'chat',
    payload: { 
      ...assistantMessage, 
      conversationId
    }
  });
}

function getIconForStage(stage: string): string {
  const icons: Record<string, string> = {
    intent_recognition: 'brain',
    planning: 'plan',
    skill_matched: 'check',
    thinking: 'thinking',
    replanning: 'replan'
  };
  return icons[stage] || 'loading';
}

function handleConfigUpdate(ws: WebSocket, payload: any) {
  try {
    if (payload.models) {
      configService.updateModels(payload.models);
      const defaultModel = configService.getDefaultModel();
      if (defaultModel) {
        llmService.updateConfig({
          provider: defaultModel.provider,
          model: defaultModel.model,
          apiKey: defaultModel.apiKey,
          baseUrl: defaultModel.baseUrl,
          temperature: defaultModel.temperature,
          maxTokens: defaultModel.maxTokens
        });
      }
    } else if (payload.language) {
      configService.updateLanguage(payload.language);
    } else {
      configService.updateLLMConfig(payload);
      llmService.updateConfig(payload);
    }
    
    sendMessage(ws, {
      type: 'config_update',
      payload: { 
        success: true, 
        config: llmService.getConfig(),
        models: configService.getModels(),
        language: configService.getLanguage()
      }
    });
  } catch (error) {
    sendMessage(ws, {
      type: 'error',
      payload: { message: 'Failed to update config' }
    });
  }
}

function sendMessage(ws: WebSocket, message: WebSocketMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
