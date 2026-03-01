import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { skillService } from './services/skill-service.ts';
import { configService } from './services/config-service.ts';
import { llmService } from './services/llm-service.ts';
import { setupWebSocket } from './handlers/websocket-handler.ts';

const app = new Hono();
const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.get('/', (c) => {
  return c.json({ 
    name: 'Skill Agent API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/skills', async (c) => {
  const skills = skillService.getSkillsMetadata();
  return c.json({ skills });
});

app.get('/api/config', (c) => {
  const config = configService.getConfig();
  return c.json({ config });
});

app.post('/api/config', async (c) => {
  try {
    const body = await c.req.json();
    configService.updateLLMConfig(body.llm);
    llmService.updateConfig(body.llm);
    return c.json({ success: true, config: configService.getConfig() });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 400);
  }
});

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    llm: {
      provider: llmService.getConfig().provider,
      model: llmService.getConfig().model
    },
    skillsLoaded: skillService.getSkillsMetadata().length
  });
});

async function startServer() {
  console.log('='.repeat(50));
  console.log('  Skill Agent System Starting...');
  console.log('='.repeat(50));
  
  console.log('\n[Config] Loading configuration...');
  const config = configService.getConfig();
  console.log(`[Config] LLM Provider: ${config.llm.provider}`);
  console.log(`[Config] LLM Model: ${config.llm.model}`);
  console.log(`[Config] Skills Path: ${config.skillsPath}`);
  
  console.log('\n[Skills] Scanning skills directory...');
  const skills = await skillService.scanSkills();
  console.log(`[Skills] Found ${skills.length} skills:`);
  skills.forEach(skill => {
    console.log(`  - ${skill.name} v${skill.version}: ${skill.description}`);
    console.log(`    Triggers: ${skill.triggers.join(', ')}`);
  });
  
  const PORT = process.env.PORT || 3000;
  
  httpServer.on('request', app.fetch);
  
  setupWebSocket(wss);
  
  httpServer.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log(`  HTTP Server: http://localhost:${PORT}`);
    console.log(`  WebSocket: ws://localhost:${PORT}`);
    console.log('='.repeat(50));
    console.log('\n[Agent] System ready! Waiting for connections...\n');
  });
}

startServer().catch(console.error);
