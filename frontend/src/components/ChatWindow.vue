<template>
  <div class="chat-container">
    <div class="messages" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <h3>{{ t('chat.startChat') }}</h3>
        <p>{{ t('chat.startChatDesc') }}</p>
      </div>
      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        :class="['message', msg.role]"
      >
        <div class="message-header">
          <span class="role-icon">{{ msg.role === 'user' ? '👤' : '🤖' }}</span>
          <span class="role-name">{{ getRoleName(msg) }}</span>
          <span v-if="msg.skillUsed" class="skill-badge">{{ msg.skillUsed }}</span>
          <span class="timestamp">{{ formatTime(msg.timestamp) }}</span>
        </div>
        <div class="message-content" v-html="formatContent(msg.content)"></div>
      </div>
      
      <div v-if="store.intent && !store.isStreaming" class="intent-panel">
        <div class="intent-header">
          <span class="intent-icon">🎯</span>
          <span class="intent-title">{{ t('chat.intentRecognition') }}</span>
          <span class="intent-type" :class="store.intent.type">{{ getIntentTypeLabel(store.intent.type) }}</span>
        </div>
        <div class="intent-description">{{ store.intent.description }}</div>
        <div class="intent-meta">
          <span v-if="store.intent.requiresPlanning">📋 {{ t('chat.requiresPlanning') }}</span>
          <span>📊 {{ t('chat.estimatedSteps') }}: {{ store.intent.estimatedSteps }}</span>
        </div>
      </div>

      <div v-if="store.intent && !store.plan && store.isProcessing && !store.isStreaming" class="transition-panel">
        <div class="transition-content">
          <div class="transition-animation">
            <div class="pulse-ring"></div>
            <div class="pulse-ring"></div>
            <div class="pulse-ring"></div>
            <span class="transition-icon">🔄</span>
          </div>
          <div class="transition-text">
            <span class="transition-title">{{ t('chat.planningSteps') }}</span>
            <span class="transition-desc">{{ t('chat.planningDesc') }}</span>
          </div>
        </div>
      </div>

      <div v-if="store.plan && store.isProcessing && !store.isStreaming" class="plan-panel executing">
        <div class="plan-header">
          <span class="plan-icon">📋</span>
          <span class="plan-title">{{ t('chat.executionPlan') }}</span>
          <span class="plan-progress">{{ getCompletedStepCount() }}/{{ store.plan.steps.length }}</span>
        </div>
        <div class="plan-goal">{{ store.plan.goal }}</div>
        <div class="plan-steps">
          <div 
            v-for="(step, index) in store.plan.steps" 
            :key="step.id"
            :class="['plan-step', step.status]"
          >
            <div class="step-indicator">
              <span v-if="step.status === 'completed'" class="step-check">✓</span>
              <span v-else-if="step.status === 'running'" class="step-spinner"></span>
              <span v-else-if="step.status === 'failed'" class="step-error">✗</span>
              <span v-else class="step-number">{{ index + 1 }}</span>
            </div>
            <div class="step-content">
              <div class="step-description">{{ step.description }}</div>
              <div v-if="step.skillName" class="step-skill">
                <span class="skill-tag">🔧 {{ step.skillName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.completedPlan" class="plan-panel collapsed">
        <div class="plan-header" @click="togglePlanExpand">
          <span class="plan-icon">📋</span>
          <span class="plan-title">{{ t('chat.executionPlan') }}</span>
          <span class="plan-status-done">✅ {{ t('chat.completed') }}</span>
          <span class="plan-expand-icon">{{ isPlanExpanded ? '▼' : '▶' }}</span>
        </div>
        <div v-show="isPlanExpanded" class="plan-steps collapsed-steps">
          <div 
            v-for="(step, index) in store.completedPlan.steps" 
            :key="step.id"
            class="plan-step completed"
          >
            <div class="step-indicator">
              <span class="step-check">✓</span>
            </div>
            <div class="step-content">
              <div class="step-description">{{ step.description }}</div>
              <div v-if="step.skillName" class="step-skill">
                <span class="skill-tag">🔧 {{ step.skillName }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div v-if="store.isStreaming && store.streamingContent" class="message assistant streaming">
        <div class="message-header">
          <span class="role-icon">🤖</span>
          <span class="role-name">{{ t('chat.agent') }}</span>
          <span class="streaming-indicator">
            <span class="typing-indicator">
              <span></span><span></span><span></span>
            </span>
          </span>
        </div>
        <div class="message-content" v-html="formatContent(store.streamingContent)"></div>
      </div>
      
      <div v-if="store.status && !store.isStreaming && store.status.stage !== 'skill_matched' && !store.isProcessing" class="status-message" :class="store.status.stage">
        <div class="status-content">
          <span class="status-icon" :class="store.status.icon">
            {{ getStatusIcon(store.status.icon) }}
          </span>
          <span class="status-text">{{ store.status.message }}</span>
        </div>
      </div>
      
      <div v-else-if="store.isProcessing && !store.status && !store.plan && !store.isStreaming" class="message assistant processing">
        <div class="message-header">
          <span class="role-icon">🤖</span>
          <span class="role-name">{{ t('chat.agent') }}</span>
        </div>
        <div class="message-content">
          <span class="typing-indicator">
            <span></span><span></span><span></span>
          </span>
          <span>{{ t('chat.processing') }}</span>
        </div>
      </div>
    </div>
    <div class="input-area">
      <div v-if="store.error" class="error-banner">{{ store.error }}</div>
      <div class="connection-status" :class="{ connected: store.connected, disconnected: !store.connected }">
        {{ store.connected ? '● ' + t('chat.connected') : '○ ' + t('chat.disconnected') }}
      </div>
      <div class="input-wrapper">
        <textarea
          v-model="inputText"
          @keydown.enter.exact.prevent="handleSend"
          :placeholder="t('chat.placeholder') + ' (' + t('chat.enterToSend') + ')'"
          rows="1"
          ref="inputRef"
          :disabled="store.isProcessing || store.isStreaming"
        ></textarea>
        <button 
          v-if="!store.isProcessing && !store.isStreaming"
          @click="handleSend" 
          :disabled="!inputText.trim() || !store.connected"
          class="send-btn"
        >
          <span v-if="store.connected">{{ t('chat.send') }}</span>
          <span v-else class="disconnected">{{ t('chat.disconnected') }}</span>
        </button>
        <button 
          v-else
          @click="handleStop"
          class="stop-btn"
        >
          <span class="stop-icon">⏹</span>
          <span>{{ t('chat.stop') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '../stores/agent'
import type { ChatMessage } from '../stores/agent'
import { marked } from 'marked'
import hljs from 'highlight.js'

const { t } = useI18n()
const store = useAgentStore()
const inputText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const isPlanExpanded = ref(false)

const messages = computed(() => store.latestMessages)

marked.setOptions({
  highlight: function(code: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, code).value
      } catch (err) {
        console.error(err)
      }
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true
})

watch(() => store.completedPlan, (newPlan) => {
  if (newPlan) {
    isPlanExpanded.value = true
  }
})

watch(() => store.isStreaming, (isStreaming) => {
  if (isStreaming && store.completedPlan) {
    setTimeout(() => {
      isPlanExpanded.value = false
    }, 800)
  }
})

watch(() => store.messages.length, (newLen, oldLen) => {
  if (newLen > oldLen && store.completedPlan && !store.isStreaming) {
    setTimeout(() => {
      store.clearCompletedPlan()
    }, 500)
  }
})

function handleSend() {
  if (!inputText.value.trim() || store.isProcessing) return
  store.sendMessage(inputText.value)
  inputText.value = ''
}

function togglePlanExpand() {
  isPlanExpanded.value = !isPlanExpanded.value
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getRoleName(msg: ChatMessage): string {
  if (msg.role === 'user') return t('chat.you')
  if (msg.skillUsed) return msg.skillUsed
  return t('chat.agent')
}

function getIntentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    question: t('chat.question'),
    task: t('chat.task'),
    conversation: t('chat.conversation'),
    multi_step_task: t('chat.multiStepTask')
  }
  return labels[type] || type
}

function getCompletedStepCount(): number {
  if (!store.plan) return 0
  return store.plan.steps.filter(s => s.status === 'completed').length
}

function getStatusIcon(icon: string): string {
  const icons: Record<string, string> = {
    search: '🔍',
    check: '✅',
    loading: '📦',
    execute: '⚡',
    done: '✨',
    error: '❌',
    thinking: '🧠',
    brain: '🧠',
    plan: '📋',
    replan: '🔄',
    generating: '✍️'
  }
  return icons[icon] || '⏳'
}

function formatContent(content: string): string {
  return marked.parse(content) as string
}

function handleStop() {
  store.stopExecution()
}

watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })

watch(() => [store.status, store.intent, store.plan], () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  background: #1a1a2e;
  min-width: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
  min-height: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  color: #888;
  margin-bottom: 10px;
}

.empty-state p {
  color: #666;
  max-width: 300px;
}

.message {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 85%;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  margin-left: auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message.assistant {
  margin-right: auto;
  background: #16213e;
  border: 1px solid #0f3460;
  color: #e0e0e0;
}

.message.streaming {
  border-color: #4fc3f7;
  box-shadow: 0 0 15px rgba(79, 195, 247, 0.2);
}

.streaming-indicator {
  margin-left: 8px;
}

.streaming-indicator .typing-indicator {
  transform: scale(0.7);
  transform-origin: left center;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.role-icon {
  font-size: 16px;
}

.role-name {
  font-weight: 600;
}

.message.user .role-name {
  color: rgba(255, 255, 255, 0.9);
}

.message.assistant .role-name {
  color: #4fc3f7;
}

.skill-badge {
  background: #e94560;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.timestamp {
  opacity: 0.6;
  margin-left: auto;
}

.message-content {
  line-height: 1.6;
  word-break: break-word;
}

.message-content :deep(.emoji) {
  font-size: 1.2em;
}

.intent-panel {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(103, 126, 234, 0.1);
  border: 1px solid rgba(103, 126, 234, 0.3);
  animation: fadeIn 0.3s ease;
}

.intent-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.intent-icon {
  font-size: 18px;
}

.intent-title {
  font-weight: 600;
  color: #4fc3f7;
}

.intent-type {
  margin-left: auto;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.intent-type.question {
  background: rgba(33, 150, 243, 0.2);
  color: #64b5f6;
}

.intent-type.task {
  background: rgba(255, 152, 0, 0.2);
  color: #ffb74d;
}

.intent-type.conversation {
  background: rgba(76, 175, 80, 0.2);
  color: #81c784;
}

.intent-type.multi_step_task {
  background: rgba(156, 39, 176, 0.2);
  color: #ce93d8;
}

.intent-description {
  color: #e0e0e0;
  font-size: 14px;
  margin-bottom: 8px;
}

.intent-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #888;
}

.transition-panel {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(103, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(103, 126, 234, 0.3);
  animation: fadeIn 0.3s ease;
}

.transition-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.transition-animation {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(103, 126, 234, 0.5);
  animation: pulse-expand 2s ease-out infinite;
}

.pulse-ring:nth-child(2) {
  animation-delay: 0.5s;
}

.pulse-ring:nth-child(3) {
  animation-delay: 1s;
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.transition-icon {
  font-size: 28px;
  animation: rotate-slow 3s linear infinite;
  z-index: 1;
}

@keyframes rotate-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.transition-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.transition-title {
  font-size: 16px;
  font-weight: 600;
  color: #4fc3f7;
}

.transition-desc {
  font-size: 13px;
  color: #888;
}

.plan-panel {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  animation: fadeIn 0.3s ease;
}

.plan-panel.executing {
  background: rgba(76, 175, 80, 0.08);
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.plan-icon {
  font-size: 18px;
}

.plan-title {
  font-weight: 600;
  color: #81c784;
}

.plan-progress {
  margin-left: auto;
  font-size: 12px;
  color: #4fc3f7;
  background: rgba(79, 195, 247, 0.2);
  padding: 2px 10px;
  border-radius: 10px;
}

.plan-panel.collapsed {
  background: rgba(76, 175, 80, 0.05);
  border-color: rgba(76, 175, 80, 0.2);
}

.plan-panel.collapsed .plan-header {
  cursor: pointer;
  margin-bottom: 0;
}

.plan-panel.collapsed .plan-header:hover {
  background: rgba(76, 175, 80, 0.1);
  border-radius: 8px;
}

.plan-status-done {
  font-size: 12px;
  color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
  padding: 2px 8px;
  border-radius: 10px;
}

.plan-expand-icon {
  margin-left: auto;
  font-size: 10px;
  color: #81c784;
  transition: transform 0.3s ease;
}

.collapsed-steps {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid rgba(76, 175, 80, 0.2);
}

.plan-goal {
  color: #888;
  font-size: 12px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(76, 175, 80, 0.2);
}

.plan-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(22, 33, 62, 0.5);
  transition: all 0.3s ease;
}

.plan-step.running {
  background: rgba(255, 152, 0, 0.15);
  border: 1px solid rgba(255, 152, 0, 0.4);
  box-shadow: 0 0 12px rgba(255, 152, 0, 0.2);
  animation: step-pulse 1.5s ease-in-out infinite;
}

@keyframes step-pulse {
  0%, 100% { 
    box-shadow: 0 0 12px rgba(255, 152, 0, 0.2);
  }
  50% { 
    box-shadow: 0 0 20px rgba(255, 152, 0, 0.4);
  }
}

.plan-step.completed {
  background: rgba(76, 175, 80, 0.1);
}

.plan-step.failed {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.step-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #0f3460;
  flex-shrink: 0;
}

.step-number {
  font-size: 12px;
  font-weight: 600;
  color: #888;
}

.step-check {
  color: #4caf50;
  font-weight: bold;
}

.step-error {
  color: #f44336;
  font-weight: bold;
}

.step-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #ff9800;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.step-content {
  flex: 1;
  min-width: 0;
}

.step-description {
  color: #e0e0e0;
  font-size: 13px;
}

.step-skill {
  margin-top: 4px;
}

.skill-tag {
  font-size: 11px;
  color: #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.status-message {
  margin-bottom: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  background: #16213e;
  border: 1px solid #0f3460;
  animation: fadeIn 0.3s ease;
}

.status-message.intent_recognition {
  border-color: #2196f3;
  background: rgba(33, 150, 243, 0.1);
}

.status-message.planning {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.status-message.skill_matched {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.status-message.thinking {
  border-color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
}

.status-message.replanning {
  border-color: #ff9800;
  background: rgba(255, 152, 0, 0.1);
}

.status-message.generating {
  border-color: #00bcd4;
  background: rgba(0, 188, 212, 0.1);
}

.status-message.completed {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.15);
}

.status-message.error {
  border-color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.status-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-icon {
  font-size: 18px;
}

.status-icon.thinking,
.status-icon.brain {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.status-icon.generating {
  animation: writing 0.8s ease-in-out infinite;
}

@keyframes writing {
  0%, 100% { 
    transform: translateX(0);
  }
  25% { 
    transform: translateX(-2px);
  }
  75% { 
    transform: translateX(2px);
  }
}

.status-icon.plan {
  animation: bounce-in 0.5s ease;
}

@keyframes pulse-glow {
  0%, 100% { 
    transform: scale(1);
    filter: brightness(1);
  }
  50% { 
    transform: scale(1.2);
    filter: brightness(1.3);
  }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.status-text {
  color: #e0e0e0;
  font-size: 14px;
}

.skill-description {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #0f3460;
  color: #888;
  font-size: 12px;
}

.processing .message-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #888;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #4fc3f7;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-area {
  flex-shrink: 0;
  padding: 16px 20px;
  background: #16213e;
  border-top: 1px solid #0f3460;
}

.error-banner {
  background: #e94560;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.connection-status {
  font-size: 12px;
  margin-bottom: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.connection-status.connected {
  color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.connection-status.disconnected {
  color: #f44336;
  background: rgba(244, 67, 54, 0.1);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

textarea {
  flex: 1;
  background: #1a1a2e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 12px 16px;
  color: #e0e0e0;
  font-size: 14px;
  resize: none;
  outline: none;
  font-family: inherit;
  min-height: 44px;
  max-height: 120px;
}

textarea:focus {
  border-color: #4fc3f7;
}

textarea::placeholder {
  color: #666;
}

.send-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop-btn {
  background: linear-gradient(135deg, #e94560 0%, #ff6b6b 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: pulse-stop 2s ease-in-out infinite;
}

.stop-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
}

.stop-icon {
  font-size: 16px;
}

@keyframes pulse-stop {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(233, 69, 96, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(233, 69, 96, 0);
  }
}

textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.disconnected {
  color: #ff6b6b;
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.3;
}

.message-content :deep(h1) { font-size: 1.6em; border-bottom: 1px solid #0f3460; padding-bottom: 8px; }
.message-content :deep(h2) { font-size: 1.4em; }
.message-content :deep(h3) { font-size: 1.2em; }
.message-content :deep(h4) { font-size: 1.1em; }

.message-content :deep(p) {
  margin: 8px 0;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.message-content :deep(li) {
  margin: 4px 0;
}

.message-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
  border-radius: 0 8px 8px 0;
}

.message-content :deep(code) {
  background: #0f3460;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.9em;
}

.message-content :deep(pre) {
  margin: 12px 0;
  padding: 16px;
  background: #0a0a1a;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid #0f3460;
}

.message-content :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.85em;
  line-height: 1.5;
}

.message-content :deep(table) {
  margin: 12px 0;
  border-collapse: collapse;
  width: 100%;
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid #0f3460;
  padding: 8px 12px;
  text-align: left;
}

.message-content :deep(th) {
  background: #0f3460;
  font-weight: 600;
}

.message-content :deep(tr:nth-child(even)) {
  background: rgba(15, 52, 96, 0.3);
}

.message-content :deep(a) {
  color: #4fc3f7;
  text-decoration: none;
}

.message-content :deep(a:hover) {
  text-decoration: underline;
}

.message-content :deep(hr) {
  border: none;
  border-top: 1px solid #0f3460;
  margin: 16px 0;
}

.message-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.message-content :deep(.hljs-keyword) { color: #c792ea; }
.message-content :deep(.hljs-string) { color: #c3e88d; }
.message-content :deep(.hljs-number) { color: #f78c6c; }
.message-content :deep(.hljs-function) { color: #82aaff; }
.message-content :deep(.hljs-class) { color: #ffcb6b; }
.message-content :deep(.hljs-comment) { color: #546e7a; font-style: italic; }
.message-content :deep(.hljs-variable) { color: #f07178; }
.message-content :deep(.hljs-built_in) { color: #82aaff; }
.message-content :deep(.hljs-title) { color: #82aaff; }
.message-content :deep(.hljs-params) { color: #f07178; }
.message-content :deep(.hljs-attr) { color: #ffcb6b; }
.message-content :deep(.hljs-symbol) { color: #c792ea; }
.message-content :deep(.hljs-meta) { color: #89ddff; }
</style>
