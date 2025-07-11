/**
 * Enhanced Orchestrator with A2A Integration
 * Extends the existing orchestrator with A2A framework capabilities
 */

import { AgentName, AgentTask, ProjectFile, AppPlan } from '../types';
import { A2AAgentDirector } from './a2aAgentDirector';
import { A2AServiceOptimized } from './a2aServiceOptimized';
import { claudeCodeService } from './claudeCodeService';

export interface EnhancedOrchestratorConfig {
  useA2A: boolean;
  fallbackToOriginal: boolean;
  a2aTimeout: number;
  retryAttempts: number;
}

export interface OrchestratorTask {
  type: 'code_generation' | 'code_explanation' | 'code_review' | 'debugging' | 'refactoring' | 'planning' | 'analysis';
  priority: 'high' | 'medium' | 'low';
  agent: AgentName;
  data: any;
  context?: Record<string, any>;
}

export interface OrchestratorResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  service: string;
  agent: AgentName;
  usedA2A: boolean;
  fallbackUsed: boolean;
}

export class EnhancedOrchestrator {
  private a2aDirector: A2AAgentDirector | null = null;
  private a2aServiceOptimized: A2AServiceOptimized | null = null;
  private config: EnhancedOrchestratorConfig;
  private initialized = false;

  constructor(config: Partial<EnhancedOrchestratorConfig> = {}) {
    this.config = {
      useA2A: true,
      fallbackToOriginal: true,
      a2aTimeout: 30000,
      retryAttempts: 3,
      ...config
    };
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      if (this.config.useA2A) {
        console.log('🎯 Initializing Enhanced Orchestrator with A2A...');
        this.a2aDirector = new A2AAgentDirector();
        this.a2aServiceOptimized = new A2AServiceOptimized();
        
        const isA2AAvailable = await this.a2aServiceOptimized.isAvailable();
        if (!isA2AAvailable) {
          console.log('⚠️  A2A framework not available, using fallback mode');
          if (!this.config.fallbackToOriginal) {
            throw new Error('A2A framework required but not available');
          }
        } else {
          console.log('✅ A2A framework initialized successfully');
        }
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error('❌ Enhanced Orchestrator initialization failed:', error);
      return false;
    }
  }

  /**
   * Generate code with A2A integration
   */
  async generateCode(file: ProjectFile, plan: AppPlan, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      // Determine optimal agent for the file type
      const agent = this.getOptimalAgentForFile(file);
      
      const task: AgentTask = {
        type: 'code_generation',
        prompt: `Generate code for ${file.path}`,
        language: this.getLanguageFromFile(file),
        context: {
          file,
          plan,
          ...context
        }
      };

      // Try A2A first if available
      if (this.a2aDirector && this.config.useA2A) {
        try {
          const result = await this.a2aDirector.executeTask(task, agent, context);
          
          if (result.success) {
            return {
              success: true,
              result: result.result,
              executionTime: Date.now() - startTime,
              service: result.service,
              agent: result.agent,
              usedA2A: true,
              fallbackUsed: false
            };
          }
        } catch (error) {
          console.log('⚠️  A2A execution failed, trying fallback:', error);
        }
      }

      // Fallback to original service
      if (this.config.fallbackToOriginal) {
        const result = await claudeCodeService.generateCode(file, plan);
        
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
          service: 'claude-code',
          agent: 'Claude Code',
          usedA2A: false,
          fallbackUsed: true
        };
      }

      throw new Error('No available service for code generation');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: 'Orchestrator',
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Debug code with A2A integration
   */
  async debugCode(file: ProjectFile, error: string, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      const task: AgentTask = {
        type: 'debugging',
        code: file.code,
        error,
        language: this.getLanguageFromFile(file),
        context: {
          file,
          ...context
        }
      };

      const agent: AgentName = 'Debugger';

      // Try A2A first if available
      if (this.a2aDirector && this.config.useA2A) {
        try {
          const result = await this.a2aDirector.executeTask(task, agent, context);
          
          if (result.success) {
            return {
              success: true,
              result: result.result,
              executionTime: Date.now() - startTime,
              service: result.service,
              agent: result.agent,
              usedA2A: true,
              fallbackUsed: false
            };
          }
        } catch (error) {
          console.log('⚠️  A2A debugging failed, trying fallback:', error);
        }
      }

      // Fallback to original service
      if (this.config.fallbackToOriginal) {
        const result = await claudeCodeService.debugCode(file, error);
        
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
          service: 'claude-code',
          agent: 'Claude Code',
          usedA2A: false,
          fallbackUsed: true
        };
      }

      throw new Error('No available service for debugging');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: 'Debugger',
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Analyze code with A2A integration
   */
  async analyzeCode(file: ProjectFile, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      const task: AgentTask = {
        type: 'analysis',
        code: file.code,
        language: this.getLanguageFromFile(file),
        prompt: `Analyze the code in ${file.path}`,
        context: {
          file,
          ...context
        }
      };

      const agent: AgentName = 'Senior Architect';

      // Try A2A first if available
      if (this.a2aDirector && this.config.useA2A) {
        try {
          const result = await this.a2aDirector.executeTask(task, agent, context);
          
          if (result.success) {
            return {
              success: true,
              result: result.result,
              executionTime: Date.now() - startTime,
              service: result.service,
              agent: result.agent,
              usedA2A: true,
              fallbackUsed: false
            };
          }
        } catch (error) {
          console.log('⚠️  A2A analysis failed, trying fallback:', error);
        }
      }

      // Fallback to original service
      if (this.config.fallbackToOriginal) {
        const result = await claudeCodeService.analyzeCode(file);
        
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
          service: 'claude-code',
          agent: 'Claude Code',
          usedA2A: false,
          fallbackUsed: true
        };
      }

      throw new Error('No available service for code analysis');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: 'Senior Architect',
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Refactor code with A2A integration
   */
  async refactorCode(file: ProjectFile, plan: AppPlan, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      const task: AgentTask = {
        type: 'refactoring',
        code: file.code,
        language: this.getLanguageFromFile(file),
        prompt: `Refactor the code in ${file.path}`,
        context: {
          file,
          plan,
          ...context
        }
      };

      const agent: AgentName = 'Senior Architect';

      // Try A2A first if available
      if (this.a2aDirector && this.config.useA2A) {
        try {
          const result = await this.a2aDirector.executeTask(task, agent, context);
          
          if (result.success) {
            return {
              success: true,
              result: result.result,
              executionTime: Date.now() - startTime,
              service: result.service,
              agent: result.agent,
              usedA2A: true,
              fallbackUsed: false
            };
          }
        } catch (error) {
          console.log('⚠️  A2A refactoring failed, trying fallback:', error);
        }
      }

      // Fallback to original service
      if (this.config.fallbackToOriginal) {
        const result = await claudeCodeService.refactorCode(file, plan);
        
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
          service: 'claude-code',
          agent: 'Claude Code',
          usedA2A: false,
          fallbackUsed: true
        };
      }

      throw new Error('No available service for refactoring');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: 'Senior Architect',
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Chat with A2A integration
   */
  async chat(message: string, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      const task: AgentTask = {
        type: 'chat',
        message,
        prompt: message,
        context
      };

      const agent: AgentName = 'Claude Code';

      // Try A2A first if available
      if (this.a2aDirector && this.config.useA2A) {
        try {
          const result = await this.a2aDirector.executeTask(task, agent, context);
          
          if (result.success) {
            return {
              success: true,
              result: result.result,
              executionTime: Date.now() - startTime,
              service: result.service,
              agent: result.agent,
              usedA2A: true,
              fallbackUsed: false
            };
          }
        } catch (error) {
          console.log('⚠️  A2A chat failed, trying fallback:', error);
        }
      }

      // Fallback to original service
      if (this.config.fallbackToOriginal) {
        const result = await claudeCodeService.chat(message, []);
        
        return {
          success: true,
          result,
          executionTime: Date.now() - startTime,
          service: 'claude-code',
          agent: 'Claude Code',
          usedA2A: false,
          fallbackUsed: true
        };
      }

      throw new Error('No available service for chat');
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: 'Claude Code',
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Execute multi-agent task
   */
  async executeMultiAgentTask(task: AgentTask, agents: AgentName[], context?: Record<string, any>): Promise<OrchestratorResult[]> {
    if (this.a2aDirector && this.config.useA2A) {
      try {
        const results = await this.a2aDirector.orchestrateMultiAgentTask(task, agents, context);
        
        return results.map(result => ({
          success: result.success,
          result: result.result,
          error: result.error,
          executionTime: result.executionTime,
          service: result.service,
          agent: result.agent,
          usedA2A: true,
          fallbackUsed: false
        }));
      } catch (error) {
        console.log('⚠️  Multi-agent orchestration failed:', error);
      }
    }

    // Fallback to individual execution
    const results = await Promise.all(
      agents.map(agent => this.executeTaskForAgent(task, agent, context))
    );

    return results;
  }

  /**
   * Execute task for specific agent
   */
  private async executeTaskForAgent(task: AgentTask, agent: AgentName, context?: Record<string, any>): Promise<OrchestratorResult> {
    const startTime = Date.now();
    
    try {
      // Use A2A if available
      if (this.a2aDirector && this.config.useA2A) {
        const result = await this.a2aDirector.executeTask(task, agent, context);
        
        return {
          success: result.success,
          result: result.result,
          error: result.error,
          executionTime: Date.now() - startTime,
          service: result.service,
          agent: result.agent,
          usedA2A: true,
          fallbackUsed: false
        };
      }

      // Fallback to original services
      return {
        success: true,
        result: { message: `Mock response from ${agent}` },
        executionTime: Date.now() - startTime,
        service: 'fallback',
        agent,
        usedA2A: false,
        fallbackUsed: true
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent,
        usedA2A: false,
        fallbackUsed: false
      };
    }
  }

  /**
   * Get optimal agent for file type
   */
  private getOptimalAgentForFile(file: ProjectFile): AgentName {
    const extension = file.path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
      case 'vue':
      case 'svelte':
        return 'Frontend Expert';
      case 'py':
      case 'java':
      case 'go':
      case 'rs':
      case 'cpp':
      case 'c':
        return 'Backend Expert';
      case 'sql':
      case 'db':
        return 'DB Architect';
      case 'yml':
      case 'yaml':
      case 'dockerfile':
        return 'DevOps Engineer';
      default:
        return 'Claude Code';
    }
  }

  /**
   * Get programming language from file
   */
  private getLanguageFromFile(file: ProjectFile): string {
    const extension = file.path.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'sql': 'sql',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'yml': 'yaml',
      'yaml': 'yaml'
    };
    
    return languageMap[extension || ''] || 'text';
  }

  /**
   * Get A2A statistics
   */
  async getA2AStats() {
    if (!this.a2aDirector) return null;
    
    try {
      const stats = await this.a2aDirector.getServiceStats();
      const health = await this.a2aDirector.getHealthStatus();
      
      return {
        serviceStats: Object.fromEntries(stats),
        serviceHealth: health,
        isA2AAvailable: await this.a2aDirector.isAvailable()
      };
    } catch (error) {
      console.error('Failed to get A2A stats:', error);
      return null;
    }
  }

  /**
   * Check if A2A is available
   */
  async isA2AAvailable(): Promise<boolean> {
    if (!this.a2aDirector) return false;
    return await this.a2aDirector.isAvailable();
  }
}

// Export singleton instance
export const enhancedOrchestrator = new EnhancedOrchestrator();
export default enhancedOrchestrator;