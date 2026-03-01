<template>
  <div class="skills-panel">
    <div class="panel-header">
      <h2>🎯 {{ t('skills.title') }}</h2>
      <div class="connection-status" :class="{ connected: store.connected, disconnected: !store.connected }">
        <span class="status-dot"></span>
        {{ store.connected ? t('chat.connected') : t('chat.disconnected') }}
      </div>
    </div>
    
    <div class="skills-list">
      <div v-if="sortedSkills.length === 0" class="empty-skills">
        <p>{{ t('skills.noSkills') }}</p>
      </div>
      <TransitionGroup name="skill-list" tag="div" class="skills-container">
        <div 
          v-for="skill in sortedSkills" 
          :key="skill.name"
          class="skill-card"
          :class="{ 
            matched: isSkillMatched(skill.name),
            running: isSkillRunning(skill.name),
            disabled: !skill.enabled 
          }"
        >
          <div class="skill-header">
            <span class="skill-icon">{{ getSkillIcon(skill.name) }}</span>
            <div class="skill-info">
              <h3>{{ skill.name }}</h3>
              <span class="version">v{{ skill.version }}</span>
            </div>
            <span v-if="isSkillRunning(skill.name)" class="running-badge">{{ t('chat.running') }}</span>
            <span v-else-if="isSkillMatched(skill.name)" class="matched-badge">{{ t('chat.matched') }}</span>
          </div>
          <p class="description">{{ skill.description }}</p>
          <div class="triggers">
            <span class="trigger-label">{{ t('skills.triggers') }}:</span>
            <span 
              v-for="trigger in skill.triggers.slice(0, 4)" 
              :key="trigger" 
              class="trigger-tag"
            >
              {{ trigger }}
            </span>
            <span v-if="skill.triggers.length > 4" class="more-triggers">
              +{{ skill.triggers.length - 4 }}
            </span>
          </div>
          <div class="skill-meta">
            <span class="author">👤 {{ skill.author }}</span>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="config-section">
      <h3>⚙️ {{ t('config.llmConfig') }}</h3>
      <div class="config-info">
        <div class="config-item">
          <span class="label">Provider:</span>
          <span class="value">{{ store.config?.provider || t('skills.notConfigured') }}</span>
        </div>
        <div class="config-item">
          <span class="label">Model:</span>
          <span class="value">{{ store.config?.model || t('skills.notConfigured') }}</span>
        </div>
        <div class="config-item">
          <span class="label">Base URL:</span>
          <span class="value">{{ store.config?.baseUrl || t('skills.default') }}</span>
        </div>
      </div>
    </div>

    <div class="help-section">
      <h3>💡 {{ t('skills.tips') }}</h3>
      <ul>
        <li>{{ t('skills.tip1') }}</li>
        <li>{{ t('skills.tip2') }}</li>
        <li>{{ t('skills.tip3') }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '../stores/agent'

const { t } = useI18n()
const store = useAgentStore()

const sortedSkills = computed(() => {
  const skills = [...store.skills]
  return skills.sort((a, b) => {
    if (store.currentSkill === a.name) return -1
    if (store.currentSkill === b.name) return 1
    const aMatched = store.matchedSkills.includes(a.name)
    const bMatched = store.matchedSkills.includes(b.name)
    if (aMatched && !bMatched) return -1
    if (!aMatched && bMatched) return 1
    return 0
  })
})

function isSkillMatched(skillName: string): boolean {
  return store.matchedSkills.includes(skillName)
}

function isSkillRunning(skillName: string): boolean {
  return store.currentSkill === skillName
}

function getSkillIcon(name: string): string {
  const icons: Record<string, string> = {
    weather: '🌤️',
    calculator: '🧮',
    translator: '🌐',
    'short-story-writer': '📖',
    'supply-chain-risk-audit': '🔍'
  }
  return icons[name] || '🔧'
}
</script>

<style scoped>
.skills-panel {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: #16213e;
  border-left: 1px solid #0f3460;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  flex-shrink: 0;
  padding: 16px 20px;
  border-bottom: 1px solid #0f3460;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h2 {
  color: #e0e0e0;
  font-size: 16px;
  margin: 0;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
}

.connection-status.connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.connection-status.disconnected {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.skills-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  min-height: 0;
  position: relative;
}

.skills-list::-webkit-scrollbar {
  width: 6px;
}

.skills-list::-webkit-scrollbar-track {
  background: #0f3460;
  border-radius: 3px;
}

.skills-list::-webkit-scrollbar-thumb {
  background: #3a4a6b;
  border-radius: 3px;
}

.skills-list::-webkit-scrollbar-thumb:hover {
  background: #4a5a7b;
}

.empty-skills {
  text-align: center;
  color: #666;
  padding: 40px 20px;
}

.skills-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-card {
  background: #1a1a2e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 12px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-list-move,
.skill-list-enter-active,
.skill-list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.skill-list-enter-from,
.skill-list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.skill-list-leave-active {
  position: absolute;
}

.skill-card.matched {
  border-color: #ffc107;
  box-shadow: 0 0 15px rgba(255, 193, 7, 0.4);
}

.skill-card.running {
  animation: running-flash 0.8s ease-in-out infinite;
}

@keyframes running-flash {
  0%, 100% { 
    border-color: #ffc107;
    box-shadow: 0 0 15px rgba(255, 193, 7, 0.4);
  }
  50% { 
    border-color: #e94560;
    box-shadow: 0 0 25px rgba(233, 69, 96, 0.7);
  }
}

.skill-card.disabled {
  opacity: 0.5;
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.skill-icon {
  font-size: 20px;
}

.skill-info {
  flex: 1;
}

.skill-info h3 {
  color: #e0e0e0;
  font-size: 13px;
  margin: 0;
}

.version {
  font-size: 10px;
  color: #666;
}

.running-badge {
  background: #e94560;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  animation: pulse 1s infinite;
}

.matched-badge {
  background: #ffc107;
  color: #1a1a2e;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.description {
  color: #888;
  font-size: 11px;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.triggers {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin-bottom: 8px;
}

.trigger-label {
  font-size: 10px;
  color: #666;
}

.trigger-tag {
  background: #0f3460;
  color: #4fc3f7;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.more-triggers {
  font-size: 10px;
  color: #666;
}

.skill-meta {
  font-size: 10px;
  color: #666;
}

.config-section, .help-section {
  flex-shrink: 0;
  padding: 12px;
  border-top: 1px solid #0f3460;
}

.config-section h3, .help-section h3 {
  color: #e0e0e0;
  font-size: 12px;
  margin: 0 0 10px 0;
}

.config-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

.config-item .label {
  color: #888;
}

.config-item .value {
  color: #4fc3f7;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.help-section ul {
  margin: 0;
  padding-left: 14px;
  font-size: 11px;
  color: #888;
  line-height: 1.6;
}
</style>
