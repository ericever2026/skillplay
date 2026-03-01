import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SkillMetadata, ChatMessage, WebSocketMessage, LLMConfig, StatusMessage, IntentInfo, PlanInfo, PlanStep } from '../types'

export const useAgentStore = defineStore('agent', () => {
  const connected = ref(false)
  const skills = ref<SkillMetadata[]>([])
  const messages = ref<ChatMessage[]>([])
  const conversationId = ref<string>('')
  const currentSkill = ref<string>('')
  const isProcessing = ref(false)
  const error = ref<string>('')
  const config = ref<LLMConfig | null>(null)
  const status = ref<StatusMessage | null>(null)
  const intent = ref<IntentInfo | null>(null)
  const plan = ref<PlanInfo | null>(null)
  const currentStep = ref<PlanStep | null>(null)
  const completedSteps = ref<PlanStep[]>([])
  const streamingContent = ref('')
  const isStreaming = ref(false)
  const completedPlan = ref<PlanInfo | null>(null)
  const matchedSkill = ref<string>('')
  const matchedSkills = ref<string[]>([])
  const skillStartTime = ref<number>(0)
  
  let ws: WebSocket | null = null

  const skillNames = computed(() => skills.value.map(s => s.name))
  
  const latestMessages = computed(() => messages.value.slice(-50))

  function connect(url: string = 'ws://localhost:3000') {
    if (ws) {
      ws.close()
    }

    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
      error.value = ''
      console.log('[WebSocket] Connected')
    }

    ws.onclose = () => {
      connected.value = false
      console.log('[WebSocket] Disconnected')
      setTimeout(() => connect(url), 3000)
    }

    ws.onerror = (e) => {
      error.value = 'WebSocket连接错误'
      console.error('[WebSocket] Error:', e)
    }

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        handleMessage(message)
      } catch (e) {
        console.error('[WebSocket] Parse error:', e)
      }
    }
  }

  function handleMessage(message: WebSocketMessage) {
    console.log('[WebSocket] Received:', message.type, message.payload)
    
    switch (message.type) {
      case 'skill_list':
        skills.value = message.payload.skills || []
        conversationId.value = message.payload.conversationId || ''
        break
      
      case 'status':
        if (message.payload.stage === 'skill_matched' && message.payload.skillName) {
          matchedSkill.value = message.payload.skillName
          if (!matchedSkills.value.includes(message.payload.skillName)) {
            matchedSkills.value.push(message.payload.skillName)
          }
        } else {
          status.value = message.payload as StatusMessage
          if (message.payload.skillName) {
            currentSkill.value = message.payload.skillName
          }
        }
        break

      case 'intent':
        intent.value = {
          type: message.payload.type,
          description: message.payload.description,
          requiresPlanning: message.payload.requiresPlanning,
          estimatedSteps: message.payload.estimatedSteps
        }
        break

      case 'plan':
        plan.value = {
          goal: message.payload.goal,
          steps: message.payload.steps.map((s: PlanStep) => ({ ...s, status: 'pending' }))
        }
        completedSteps.value = []
        break

      case 'step_start':
        currentStep.value = {
          id: message.payload.stepId,
          description: message.payload.description,
          type: message.payload.stepType,
          skillName: message.payload.skillName,
          status: 'running'
        }
        if (plan.value) {
          const step = plan.value.steps.find(s => s.id === message.payload.stepId)
          if (step) step.status = 'running'
        }
        if (message.payload.skillName) {
          currentSkill.value = message.payload.skillName
          matchedSkill.value = ''
          skillStartTime.value = Date.now()
        }
        break

      case 'step_complete':
        const elapsed = Date.now() - skillStartTime.value
        const minDisplayTime = 1000
        const clearSkillState = () => {
          if (currentStep.value && currentStep.value.id === message.payload.stepId) {
            currentStep.value.status = 'completed'
            completedSteps.value.push({ ...currentStep.value })
            currentStep.value = null
          }
          if (plan.value) {
            const step = plan.value.steps.find(s => s.id === message.payload.stepId)
            if (step) step.status = 'completed'
          }
          currentSkill.value = ''
          matchedSkill.value = ''
        }
        
        if (elapsed < minDisplayTime) {
          setTimeout(clearSkillState, minDisplayTime - elapsed)
        } else {
          clearSkillState()
        }
        break

      case 'step_error':
        if (currentStep.value && currentStep.value.id === message.payload.stepId) {
          currentStep.value.status = 'failed'
          currentStep.value = null
        }
        if (plan.value) {
          const step = plan.value.steps.find(s => s.id === message.payload.stepId)
          if (step) step.status = 'failed'
        }
        break

      case 'plan_complete':
        if (plan.value) {
          plan.value.steps.forEach(s => s.status = 'completed')
          completedPlan.value = { ...plan.value }
          plan.value = null
        }
        break

      case 'stream':
        if (!isStreaming.value) {
          isStreaming.value = true
          streamingContent.value = ''
          status.value = null
        }
        streamingContent.value += message.payload.chunk
        break
      
      case 'chat':
        if (message.payload.conversationId) {
          conversationId.value = message.payload.conversationId
        }
        if (message.payload.role === 'assistant') {
          if (isStreaming.value && streamingContent.value) {
            addMessage({
              role: 'assistant',
              content: streamingContent.value,
              timestamp: message.payload.timestamp,
              skillUsed: message.payload.skillUsed
            })
            streamingContent.value = ''
            isStreaming.value = false
          } else {
            addMessage({
              role: 'assistant',
              content: message.payload.content,
              timestamp: message.payload.timestamp,
              skillUsed: message.payload.skillUsed
            })
          }
        }
        isProcessing.value = false
        currentSkill.value = ''
        matchedSkills.value = []
        status.value = null
        intent.value = null
        plan.value = null
        currentStep.value = null
        break
      
      case 'skill_loaded':
        currentSkill.value = message.payload.skillName
        break
      
      case 'skill_executing':
        isProcessing.value = true
        currentSkill.value = message.payload.skillName
        break
      
      case 'skill_result':
        if (message.payload.success) {
          addMessage({
            role: 'assistant',
            content: message.payload.result,
            timestamp: Date.now(),
            skillUsed: message.payload.skillName
          })
        } else {
          addMessage({
            role: 'assistant',
            content: `❌ Skill执行失败: ${message.payload.error}`,
            timestamp: Date.now()
          })
        }
        currentSkill.value = ''
        isProcessing.value = false
        status.value = null
        break
      
      case 'error':
        error.value = message.payload.message
        isProcessing.value = false
        currentSkill.value = ''
        status.value = null
        break
      
      case 'config_update':
        if (message.payload.config) {
          config.value = message.payload.config
        }
        break
    }
  }

  function addMessage(message: ChatMessage) {
    messages.value.push({
      ...message,
      id: `${message.timestamp}-${Math.random().toString(36).substr(2, 9)}`
    })
  }

  function sendMessage(content: string) {
    if (!ws || !connected.value || !content.trim()) return

    isProcessing.value = true
    status.value = null
    intent.value = null
    plan.value = null
    currentStep.value = null
    completedSteps.value = []
    matchedSkill.value = ''
    matchedSkills.value = []
    skillStartTime.value = 0
    
    addMessage({
      role: 'user',
      content: content.trim(),
      timestamp: Date.now()
    })

    ws.send(JSON.stringify({
      type: 'chat',
      payload: { content: content.trim() }
    }))
  }

  function updateConfig(newConfig: Partial<LLMConfig>) {
    if (!ws || !connected.value) return
    
    ws.send(JSON.stringify({
      type: 'config_update',
      payload: newConfig
    }))
  }

  function clearMessages() {
    messages.value = []
  }

  function clearCompletedPlan() {
    completedPlan.value = null
  }

  function stopExecution() {
    if (ws && connected.value) {
      ws.send(JSON.stringify({
        type: 'stop'
      }))
    }
    
    isProcessing.value = false
    isStreaming.value = false
    streamingContent.value = ''
    status.value = null
    intent.value = null
    plan.value = null
    currentStep.value = null
    completedSteps.value = []
    currentSkill.value = ''
    matchedSkill.value = ''
    matchedSkills.value = []
    skillStartTime.value = 0
  }

  return {
    connected,
    skills,
    messages,
    conversationId,
    currentSkill,
    isProcessing,
    error,
    config,
    status,
    intent,
    plan,
    currentStep,
    completedSteps,
    streamingContent,
    isStreaming,
    completedPlan,
    matchedSkill,
    matchedSkills,
    skillNames,
    latestMessages,
    connect,
    sendMessage,
    updateConfig,
    clearMessages,
    clearCompletedPlan,
    stopExecution
  }
})
