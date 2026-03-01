<template>
  <div class="config-panel-wrapper">
    <div class="config-panel-overlay" v-if="isVisible" @click="close"></div>
    <div class="config-panel" :class="{ open: isVisible }">
      <div class="config-header">
        <h2>⚙️ {{ t('config.title') }}</h2>
        <button class="close-btn" @click="close">✕</button>
      </div>
      
      <div class="config-content">
        <div class="config-section">
          <h3>🌐 {{ t('config.language') }}</h3>
          <div class="config-item">
            <label>{{ t('config.interfaceLanguage') }}</label>
            <select v-model="currentLanguage" @change="changeLanguage">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>

        <div class="config-section">
          <h3>🤖 {{ t('config.llmConfig') }}</h3>
          <div class="model-list">
            <div 
              v-for="(model, index) in models" 
              :key="index"
              class="model-card"
              :class="{ active: model.isDefault }"
            >
              <div class="model-header">
                <span class="model-name">{{ model.name }}</span>
                <span v-if="model.isDefault" class="default-badge">{{ t('config.default') }}</span>
                <div class="model-actions">
                  <button 
                    v-if="!model.isDefault" 
                    class="action-btn set-default"
                    @click="setDefaultModel(index)"
                    :title="t('config.setDefault')"
                  >⭐</button>
                  <button 
                    class="action-btn edit"
                    @click="editModel(index)"
                    :title="t('config.edit')"
                  >✏️</button>
                  <button 
                    v-if="models.length > 1"
                    class="action-btn delete"
                    @click="deleteModel(index)"
                    :title="t('config.delete')"
                  >🗑️</button>
                </div>
              </div>
              <div class="model-info">
                <div class="info-row">
                  <span class="info-label">{{ t('config.provider') }}:</span>
                  <span class="info-value">{{ model.provider }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">{{ t('config.model') }}:</span>
                  <span class="info-value">{{ model.model }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">{{ t('config.baseUrl') }}:</span>
                  <span class="info-value">{{ model.baseUrl }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button class="add-model-btn" @click="showAddModelDialog = true">
            ➕ {{ t('config.addModel') }}
          </button>
        </div>
      </div>

      <div class="config-footer">
        <button class="save-btn" @click="saveConfig">{{ t('config.save') }}</button>
        <button class="cancel-btn" @click="close">{{ t('config.cancel') }}</button>
      </div>

      <div v-if="showAddModelDialog" class="dialog-overlay" @click.self="showAddModelDialog = false">
        <div class="dialog">
          <div class="dialog-header">
            <h3>{{ editingIndex >= 0 ? t('config.editModelTitle') : t('config.addModelTitle') }}</h3>
            <button class="close-btn" @click="closeModelDialog">✕</button>
          </div>
          <div class="dialog-content">
            <div class="form-item">
              <label>{{ t('config.modelName') }}</label>
              <input v-model="editingModel.name" :placeholder="t('config.modelNamePlaceholder')" />
            </div>
            <div class="form-item">
              <label>{{ t('config.provider') }}</label>
              <select v-model="editingModel.provider" @change="onProviderChange">
                <optgroup label="国际模型">
                  <option value="openai">OpenAI</option>
                </optgroup>
                <optgroup label="国内模型">
                  <option value="deepseek">DeepSeek (深度求索)</option>
                  <option value="zhipu">智谱 AI (GLM)</option>
                  <option value="qwen">通义千问 (阿里云)</option>
                  <option value="kimi">Kimi (月之暗面)</option>
                  <option value="doubao">豆包 (字节跳动)</option>
                  <option value="wenxin">文心一言 (百度)</option>
                  <option value="spark">讯飞星火</option>
                </optgroup>
                <optgroup label="本地模型">
                  <option value="ollama">Ollama</option>
                </optgroup>
                <optgroup label="其他">
                  <option value="custom">Custom (自定义)</option>
                </optgroup>
              </select>
            </div>
            <div class="form-item">
              <label>{{ t('config.model') }}</label>
              <input v-model="editingModel.model" :placeholder="t('config.modelPlaceholder')" />
            </div>
            <div class="form-item">
              <label>{{ t('config.baseUrl') }}</label>
              <input v-model="editingModel.baseUrl" :placeholder="t('config.baseUrlPlaceholder')" />
            </div>
            <div class="form-item">
              <label>{{ t('config.apiKey') }}</label>
              <input 
                v-model="editingModel.apiKey" 
                type="password" 
                :placeholder="t('config.apiKeyPlaceholder')"
              />
            </div>
            <div class="form-item">
              <label>{{ t('config.temperature') }}</label>
              <input 
                v-model.number="editingModel.temperature" 
                type="number" 
                min="0" 
                max="2" 
                step="0.1"
              />
            </div>
            <div class="form-item">
              <label>{{ t('config.maxTokens') }}</label>
              <input 
                v-model.number="editingModel.maxTokens" 
                type="number" 
                min="100" 
                max="32000"
              />
            </div>
          </div>
          <div class="dialog-footer">
            <button class="save-btn" @click="saveModel">{{ t('config.saveModel') }}</button>
            <button class="cancel-btn" @click="closeModelDialog">{{ t('config.cancelModel') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAgentStore } from '../stores/agent'

const { t, locale } = useI18n()

interface ModelConfig {
  name: string
  provider: string
  model: string
  baseUrl: string
  apiKey: string
  temperature: number
  maxTokens: number
  isDefault: boolean
}

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-3.5-turbo' },
  deepseek: { baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  zhipu: { baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-turbo' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-4k' },
  wenxin: { baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat', model: 'ernie-bot-4' },
  spark: { baseUrl: 'https://spark-api-open.xf-yun.com/v1', model: 'generalv3.5' },
  ollama: { baseUrl: 'http://localhost:11434', model: 'llama2' },
  custom: { baseUrl: '', model: '' }
}

const props = defineProps<{
  isVisible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useAgentStore()
const currentLanguage = ref('zh-CN')
const models = ref<ModelConfig[]>([])
const showAddModelDialog = ref(false)
const editingIndex = ref(-1)
const editingModel = ref<ModelConfig>({
  name: '',
  provider: 'openai',
  model: '',
  baseUrl: '',
  apiKey: '',
  temperature: 0.7,
  maxTokens: 2048,
  isDefault: false
})

onMounted(() => {
  loadConfig()
})

function loadConfig() {
  const savedLanguage = localStorage.getItem('language')
  if (savedLanguage) {
    currentLanguage.value = savedLanguage
  }

  const savedModels = localStorage.getItem('llmModels')
  if (savedModels) {
    models.value = JSON.parse(savedModels)
  } else {
    models.value = [
      {
        name: 'DeepSeek',
        provider: 'openai',
        model: 'deepseek-chat',
        baseUrl: 'https://api.deepseek.com',
        apiKey: '',
        temperature: 0.7,
        maxTokens: 2048,
        isDefault: true
      }
    ]
  }
}

function changeLanguage() {
  localStorage.setItem('language', currentLanguage.value)
  locale.value = currentLanguage.value
}

function onProviderChange() {
  const defaults = PROVIDER_DEFAULTS[editingModel.value.provider]
  if (defaults) {
    editingModel.value.baseUrl = defaults.baseUrl
    editingModel.value.model = defaults.model
  }
}

function setDefaultModel(index: number) {
  models.value.forEach((m, i) => {
    m.isDefault = i === index
  })
}

function editModel(index: number) {
  editingIndex.value = index
  editingModel.value = { ...models.value[index] }
  showAddModelDialog.value = true
}

function deleteModel(index: number) {
  if (models.value.length > 1) {
    const wasDefault = models.value[index].isDefault
    models.value.splice(index, 1)
    if (wasDefault && models.value.length > 0) {
      models.value[0].isDefault = true
    }
  }
}

function closeModelDialog() {
  showAddModelDialog.value = false
  editingIndex.value = -1
  editingModel.value = {
    name: '',
    provider: 'openai',
    model: '',
    baseUrl: '',
    apiKey: '',
    temperature: 0.7,
    maxTokens: 2048,
    isDefault: false
  }
}

function saveModel() {
  if (!editingModel.value.name || !editingModel.value.model) {
    return
  }

  if (editingIndex.value >= 0) {
    models.value[editingIndex.value] = { ...editingModel.value }
  } else {
    editingModel.value.isDefault = models.value.length === 0
    models.value.push({ ...editingModel.value })
  }

  closeModelDialog()
}

function saveConfig() {
  localStorage.setItem('language', currentLanguage.value)
  localStorage.setItem('llmModels', JSON.stringify(models.value))
  
  const defaultModel = models.value.find(m => m.isDefault)
  if (defaultModel) {
    store.updateConfig({
      provider: defaultModel.provider,
      model: defaultModel.model,
      baseUrl: defaultModel.baseUrl,
      apiKey: defaultModel.apiKey,
      temperature: defaultModel.temperature,
      maxTokens: defaultModel.maxTokens,
      models: models.value,
      language: currentLanguage.value
    })
  }
  
  close()
}

function close() {
  emit('close')
}
</script>

<style scoped>
.config-panel-wrapper {
  position: relative;
}

.config-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.config-panel {
  position: fixed;
  top: 0;
  right: -450px;
  width: 450px;
  height: 100vh;
  background: #1a1a2e;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #0f3460;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
  z-index: 1001;
  transition: right 0.3s ease;
}

.config-panel.open {
  right: 0;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #0f3460;
  flex-shrink: 0;
}

.config-header h2 {
  margin: 0;
  color: #e0e0e0;
  font-size: 20px;
}

.close-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  color: #e0e0e0;
  background: rgba(255, 255, 255, 0.1);
}

.config-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.config-section {
  margin-bottom: 32px;
}

.config-section h3 {
  margin: 0 0 16px 0;
  color: #4fc3f7;
  font-size: 16px;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.config-item label {
  color: #888;
  min-width: 100px;
}

.config-item select,
.config-item input {
  flex: 1;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
}

.config-item select:focus,
.config-item input:focus {
  border-color: #4fc3f7;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.model-card {
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.model-card.active {
  border-color: #4fc3f7;
  box-shadow: 0 0 10px rgba(79, 195, 247, 0.2);
}

.model-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.model-name {
  font-weight: 600;
  color: #e0e0e0;
  font-size: 16px;
}

.default-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
}

.model-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}

.action-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 14px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.set-default:hover {
  background: rgba(255, 193, 7, 0.2);
}

.action-btn.edit:hover {
  background: rgba(79, 195, 247, 0.2);
}

.action-btn.delete:hover {
  background: rgba(233, 69, 96, 0.2);
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
}

.info-label {
  color: #666;
  min-width: 80px;
}

.info-value {
  color: #888;
  word-break: break-all;
}

.add-model-btn {
  width: 100%;
  background: transparent;
  border: 2px dashed #0f3460;
  border-radius: 12px;
  padding: 16px;
  color: #4fc3f7;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-model-btn:hover {
  border-color: #4fc3f7;
  background: rgba(79, 195, 247, 0.1);
}

.config-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #0f3460;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.cancel-btn {
  background: transparent;
  color: #888;
  border: 1px solid #0f3460;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  border-color: #888;
  color: #e0e0e0;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.dialog {
  background: #1a1a2e;
  border-radius: 16px;
  width: 500px;
  max-width: 90vw;
  border: 1px solid #0f3460;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #0f3460;
}

.dialog-header h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 18px;
}

.dialog-content {
  padding: 24px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  color: #888;
  margin-bottom: 8px;
  font-size: 13px;
}

.form-item input,
.form-item select {
  width: 100%;
  background: #16213e;
  border: 1px solid #0f3460;
  border-radius: 8px;
  padding: 10px 14px;
  color: #e0e0e0;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.form-item input:focus,
.form-item select:focus {
  border-color: #4fc3f7;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #0f3460;
}
</style>
