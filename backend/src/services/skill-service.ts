import { SkillMetadata, SkillConfig, SkillExecutionResult } from '../types.ts';
import { configService } from './config-service.ts';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';

export class SkillService {
  private skillsMetadata: Map<string, SkillMetadata> = new Map();
  private loadedSkills: Map<string, any> = new Map();
  private skillsPath: string;

  constructor() {
    this.skillsPath = configService.getSkillsPath();
  }

  async scanSkills(): Promise<SkillMetadata[]> {
    this.skillsMetadata.clear();
    
    if (!existsSync(this.skillsPath)) {
      console.warn('Skills directory not found:', this.skillsPath);
      return [];
    }

    const skillDirs = readdirSync(this.skillsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const skillDir of skillDirs) {
      const skillPath = join(this.skillsPath, skillDir);
      
      let metadata: SkillMetadata | null = null;
      
      const skillJsonPath = join(skillPath, 'skill.json');
      const skillMdPath = join(skillPath, 'SKILL.md');
      
      if (existsSync(skillJsonPath)) {
        metadata = this.loadFromJson(skillDir, skillPath, skillJsonPath);
      } else if (existsSync(skillMdPath)) {
        metadata = this.loadFromMarkdown(skillDir, skillPath, skillMdPath);
      }
      
      if (metadata) {
        this.skillsMetadata.set(metadata.name, metadata);
        console.log(`[Skill Scanner] Found skill: ${metadata.name} (triggers: ${metadata.triggers.join(', ')})`);
      }
    }

    return Array.from(this.skillsMetadata.values());
  }

  private loadFromJson(skillDir: string, skillPath: string, configPath: string): SkillMetadata | null {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const skillConfig: SkillConfig = JSON.parse(content);
      
      return {
        name: skillConfig.name || skillDir,
        description: skillConfig.description || '',
        version: skillConfig.version || '1.0.0',
        author: skillConfig.author || 'unknown',
        triggers: skillConfig.triggers || [],
        path: skillPath,
        enabled: skillConfig.enabled !== false
      };
    } catch (error) {
      console.error(`Failed to load skill.json: ${configPath}`, error);
      return null;
    }
  }

  private loadFromMarkdown(skillDir: string, skillPath: string, mdPath: string): SkillMetadata | null {
    try {
      let content = readFileSync(mdPath, 'utf-8');
      content = content.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
      
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontMatterMatch) {
        console.warn(`No front matter found in SKILL.md: ${mdPath}`);
        return null;
      }

      const frontMatter = frontMatterMatch[1];
      const metadata: Record<string, any> = this.parseYamlFrontMatter(frontMatter);

      return {
        name: metadata.name || skillDir,
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        author: metadata.author || 'unknown',
        triggers: Array.isArray(metadata.triggers) ? metadata.triggers : [],
        path: skillPath,
        enabled: true
      };
    } catch (error) {
      console.error(`Failed to load SKILL.md: ${mdPath}`, error);
      return null;
    }
  }

  private parseYamlFrontMatter(frontMatter: string): Record<string, any> {
    const metadata: Record<string, any> = {};
    const lines = frontMatter.split('\n');
    let currentKey: string | null = null;
    let currentArray: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('  - ') || line.startsWith('- ')) {
        if (currentKey) {
          const value = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
          if (value) {
            currentArray.push(value);
          }
        }
        continue;
      }

      if (currentKey && currentArray.length > 0) {
        metadata[currentKey] = currentArray;
        currentKey = null;
        currentArray = [];
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        let value: any = line.substring(colonIndex + 1).trim();
        
        if (value.startsWith('[') && value.endsWith(']')) {
          value = value
            .slice(1, -1)
            .split(',')
            .map(s => s.trim().replace(/^["']|["']$/g, ''))
            .filter(s => s);
          metadata[key] = value;
        } else if (value === '' || value === '[]') {
          currentKey = key;
          currentArray = [];
        } else {
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          metadata[key] = value;
        }
      }
    }

    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
    }

    return metadata;
  }

  getSkillsMetadata(): SkillMetadata[] {
    return Array.from(this.skillsMetadata.values());
  }

  matchSkill(userInput: string): SkillMetadata | null {
    const input = userInput.toLowerCase();
    
    console.log(`[Skill Matcher] Input: "${input}"`);
    console.log(`[Skill Matcher] Available skills: ${Array.from(this.skillsMetadata.keys()).join(', ')}`);
    
    for (const [name, metadata] of this.skillsMetadata) {
      if (!metadata.enabled) continue;
      
      for (const trigger of metadata.triggers) {
        console.log(`[Skill Matcher] Checking trigger "${trigger}" in "${input}"`);
        if (input.includes(trigger.toLowerCase())) {
          console.log(`[Skill Matcher] Matched: ${name}`);
          return metadata;
        }
      }
    }
    
    console.log(`[Skill Matcher] No match found`);
    return null;
  }

  async executeSkill(skillName: string, userInput: string, context: string[]): Promise<SkillExecutionResult> {
    const metadata = this.skillsMetadata.get(skillName);
    if (!metadata) {
      return {
        success: false,
        result: '',
        error: `Skill not found: ${skillName}`,
        executionTime: 0
      };
    }

    const startTime = Date.now();
    console.log(`[Skill Executor] Executing skill: ${skillName}`);
    
    try {
      const skillMdPath = join(metadata.path, 'SKILL.md');
      
      if (!existsSync(skillMdPath)) {
        return {
          success: false,
          result: '',
          error: `SKILL.md not found: ${skillMdPath}`,
          executionTime: Date.now() - startTime
        };
      }

      let skillContent = readFileSync(skillMdPath, 'utf-8');
      skillContent = skillContent.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
      
      const contentWithoutFrontMatter = skillContent.replace(/^---\n[\s\S]*?\n---\n?/, '');
      
      const result = await this.executeSkillWithLLM(skillName, contentWithoutFrontMatter, userInput, context);
      
      return {
        success: true,
        result: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }

  private async executeSkillWithLLM(skillName: string, skillInstructions: string, userInput: string, context: string[]): Promise<string> {
    const { llmService } = await import('./llm-service.ts');
    
    const systemPrompt = `你正在执行技能: ${skillName}

${skillInstructions}

请根据以上技能指令，处理用户的请求。`;

    const messages = [
      ...context.map(msg => ({ role: 'user' as const, content: msg })),
      { role: 'user' as const, content: userInput }
    ];

    let result = '';
    await llmService.chatStream(messages, (chunk) => {
      result += chunk;
    }, systemPrompt);

    return result;
  }

  isSkillLoaded(skillName: string): boolean {
    return this.loadedSkills.has(skillName);
  }

  getLoadedSkills(): string[] {
    return Array.from(this.loadedSkills.keys());
  }
}

export const skillService = new SkillService();
