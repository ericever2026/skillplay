<template>
  <div class="app">
    <header class="app-header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon">🤖</span>
          <h1>{{ t('app.title') }}</h1>
        </div>
        <span class="subtitle">{{ t('app.subtitle') }}</span>
      </div>
      <button class="config-btn" @click="showConfig = true" :title="t('header.config')">
        ⚙️
      </button>
    </header>
    <main class="app-main">
      <ChatWindow />
      <SkillsPanel />
    </main>
    <ConfigPanel :isVisible="showConfig" @close="showConfig = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import ChatWindow from './components/ChatWindow.vue'
import SkillsPanel from './components/SkillsPanel.vue'
import ConfigPanel from './components/ConfigPanel.vue'
import { useAgentStore } from './stores/agent'

const { t } = useI18n()
const store = useAgentStore()
const showConfig = ref(false)

onMounted(() => {
  store.connect('ws://localhost:3000')
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: #0f0f1a;
  color: #e0e0e0;
}

#app {
  height: 100%;
  width: 100%;
}

.app {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-bottom: 1px solid #0f3460;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo h1 {
  font-size: 20px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subtitle {
  color: #666;
  font-size: 11px;
  margin-left: 40px;
}

.config-btn {
  background: transparent;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.config-btn:hover {
  background: rgba(79, 195, 247, 0.1);
  border-color: #4fc3f7;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #1a1a2e;
}

::-webkit-scrollbar-thumb {
  background: #0f3460;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #1a3a5c;
}
</style>
