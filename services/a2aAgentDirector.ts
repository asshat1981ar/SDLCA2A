/**
 * A2A Agent Director
 * Manages cross-application AI interactions and intelligent task routing
 */

import { AgentName, AgentTask, A2ASession } from '../types';
import { A2AService } from './a2aService';

export interface A2ADirectorConfig {
  masterBridgeUrl?: string;
  fallbackService?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface A2ATaskPlan {
  primaryAgent: AgentName;
  primaryService: string;
  backupAgent?: AgentName;
  backupService?: string;
  taskType: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
  dependencies?: string[];
}

export interface A2AExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  service: string;
  agent: AgentName;
  sessionId?: string;
  fallbackUsed?: boolean;
}

export class A2AAgentDirector {
  private a2aService: A2AService;
  private config: A2ADirectorConfig;
  private activeSessions: Map<string, A2ASession>;
  private taskQueue: Array<{ task: AgentTask; priority: number; timestamp: Date }>;
  private serviceStats: Map<string, { success: number; failure: number; avgResponseTime: number }>;
  private agentCapabilities: Map<AgentName, string[]>;

  constructor(config: A2ADirectorConfig = {}) {
    this.config = {
      masterBridgeUrl: 'http://localhost:3000',
      fallbackService: 'claude-code',
      maxRetries: 3,
      timeoutMs: 30000,
      ...config
    };
    
    this.a2aService = new A2AService(this.config.masterBridgeUrl);
    this.activeSessions = new Map();
    this.taskQueue = [];
    this.serviceStats = new Map();
    this.agentCapabilities = new Map();
    
    this.initializeAgentCapabilities();
  }

  /**
   * Initialize agent capabilities mapping
   */
  private initializeAgentCapabilities() {
    this.agentCapabilities.set('Frontend Expert', [
      'code_generation', 'ui_design', 'code_review', 'refactoring'
    ]);
    
    this.agentCapabilities.set('Backend Expert', [
      'code_generation', 'architecture', 'database', 'security', 'performance'
    ]);
    
    this.agentCapabilities.set('Claude Code', [
      'code_explanation', 'debugging', 'refactoring', 'code_review', 'chat'
    ]);
    
    this.agentCapabilities.set('Senior Architect', [
      'architecture', 'system_design', 'performance', 'security', 'analysis'
    ]);
    
    this.agentCapabilities.set('DevOps Engineer', [
      'deployment', 'performance', 'monitoring', 'security', 'architecture'
    ]);
    
    this.agentCapabilities.set('QA Engineer', [
      'testing', 'code_review', 'debugging', 'performance'
    ]);
    
    this.agentCapabilities.set('Security Analyst', [
      'security', 'code_review', 'analysis', 'architecture'
    ]);
    
    this.agentCapabilities.set('Debugger', [
      'debugging', 'code_explanation', 'testing', 'performance'
    ]);
    
    this.agentCapabilities.set('A2A Agent Director', [
      'orchestration', 'routing', 'session_management', 'analysis'
    ]);
    
    this.agentCapabilities.set('Blackbox AI Agent', [
      'code_generation', 'ui_design', 'code_review'
    ]);
    
    this.agentCapabilities.set('Claude Pro Agent', [
      'code_explanation', 'debugging', 'analysis', 'refactoring'
    ]);
    
    this.agentCapabilities.set('Gemini CLI Agent', [
      'architecture', 'analysis', 'general_query', 'system_design'
    ]);
  }

  /**
   * Create an intelligent task execution plan
   */
  async createTaskPlan(task: AgentTask, preferredAgent?: AgentName): Promise<A2ATaskPlan> {
    // Get optimal agent and service
    const primaryAgent = preferredAgent || await this.selectOptimalAgent(task);
    const primaryService = this.a2aService.getOptimalService(primaryAgent, task);
    
    // Get backup options
    const backupAgent = await this.selectBackupAgent(task, primaryAgent);
    const backupService = backupAgent ? this.a2aService.getOptimalService(backupAgent, task) : undefined;
    
    // Estimate task duration based on type and complexity
    const estimatedDuration = this.estimateTaskDuration(task);
    
    return {
      primaryAgent,
      primaryService,
      backupAgent,
      backupService,
      taskType: task.type,
      priority: this.determinePriority(task),
      estimatedDuration,
      dependencies: this.identifyDependencies(task)
    };
  }

  /**
   * Execute a task with intelligent routing and fallback
   */
  async executeTask(task: AgentTask, preferredAgent?: AgentName, context?: Record<string, any>): Promise<A2AExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Create execution plan
      const plan = await this.createTaskPlan(task, preferredAgent);
      
      // Check if A2A service is available
      const isA2AAvailable = await this.a2aService.isAvailable();
      if (!isA2AAvailable) {
        throw new Error('A2A service is not available');
      }
      
      // Execute primary plan
      let result = await this.executeTaskPlan(plan, task, context);
      
      // If primary fails, try backup
      if (!result.success && plan.backupAgent && plan.backupService) {
        console.log(`Primary execution failed, trying backup: ${plan.backupAgent} -> ${plan.backupService}`);
        
        const backupPlan: A2ATaskPlan = {
          ...plan,
          primaryAgent: plan.backupAgent,
          primaryService: plan.backupService!
        };
        
        result = await this.executeTaskPlan(backupPlan, task, context);
        result.fallbackUsed = true;
      }
      
      // Update statistics
      this.updateServiceStats(result.service, result.success, Date.now() - startTime);
      
      return {
        ...result,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime,
        service: 'unknown',
        agent: preferredAgent || 'A2A Agent Director'
      };
    }
  }

  /**
   * Execute a task plan
   */
  private async executeTaskPlan(plan: A2ATaskPlan, task: AgentTask, context?: Record<string, any>): Promise<A2AExecutionResult> {
    try {
      const response = await this.a2aService.routeToService({
        service: plan.primaryService as any,
        agent: plan.primaryAgent,
        task,
        context
      });
      
      return {
        success: response.success,
        result: response.result,
        error: response.error,
        executionTime: 0, // Will be set by caller
        service: plan.primaryService,
        agent: plan.primaryAgent,
        sessionId: response.sessionId
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        service: plan.primaryService,
        agent: plan.primaryAgent
      };
    }
  }

  /**
   * Orchestrate multiple agents for complex tasks
   */
  async orchestrateMultiAgentTask(
    task: AgentTask,
    agents: AgentName[],
    context?: Record<string, any>
  ): Promise<A2AExecutionResult[]> {
    try {
      const response = await this.a2aService.orchestrateTask({
        task,
        agents,
        context
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Orchestration failed');
      }
      
      return response.results?.map(result => ({
        success: !result.error,
        result: result.result,
        error: result.error,
        executionTime: 0,
        service: result.service,
        agent: result.agent,
        sessionId: response.sessionId
      })) || [];
      
    } catch (error) {
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: 0,
        service: 'orchestration',
        agent: 'A2A Agent Director'
      }];
    }
  }

  /**
   * Select optimal agent for a task
   */
  private async selectOptimalAgent(task: AgentTask): Promise<AgentName> {
    // Get service health status
    const healthStatus = await this.a2aService.getHealthStatus();
    
    // Task-specific agent selection
    const taskAgentMap: Record<string, AgentName[]> = {
      'code_generation': ['Frontend Expert', 'Backend Expert', 'Blackbox AI Agent'],
      'code_explanation': ['Claude Code', 'Claude Pro Agent'],
      'debugging': ['Debugger', 'Claude Pro Agent'],
      'architecture': ['Senior Architect', 'Gemini CLI Agent'],
      'deployment': ['DevOps Engineer'],
      'testing': ['QA Engineer'],
      'security': ['Security Analyst'],
      'ui_design': ['Frontend Expert', 'Blackbox AI Agent'],
      'performance': ['Senior Architect', 'Backend Expert'],
      'analysis': ['Senior Architect', 'Gemini CLI Agent'],
      'chat': ['Claude Code', 'Claude Pro Agent']
    };
    
    const candidateAgents = taskAgentMap[task.type] || ['Claude Code'];
    
    // Select agent based on service health and capabilities
    for (const agent of candidateAgents) {
      const service = this.a2aService.getOptimalService(agent, task);
      if (healthStatus[service]?.status === 'healthy') {
        return agent;
      }
    }
    
    // Fallback to first candidate
    return candidateAgents[0] || 'Claude Code';
  }

  /**
   * Select backup agent for fallback
   */
  private async selectBackupAgent(task: AgentTask, primaryAgent: AgentName): Promise<AgentName | undefined> {
    const capabilities = this.agentCapabilities.get(primaryAgent) || [];
    
    // Find agents with similar capabilities
    const similarAgents: AgentName[] = [];
    for (const [agent, agentCaps] of this.agentCapabilities) {
      if (agent !== primaryAgent && capabilities.some(cap => agentCaps.includes(cap))) {
        similarAgents.push(agent);
      }
    }
    
    // Return first similar agent or fallback
    return similarAgents[0] || 'Claude Code';
  }

  /**
   * Estimate task duration based on type and complexity
   */
  private estimateTaskDuration(task: AgentTask): number {
    const baseDurations: Record<string, number> = {
      'code_generation': 10000,
      'code_explanation': 5000,
      'debugging': 15000,
      'architecture': 20000,
      'deployment': 30000,
      'testing': 8000,
      'security': 12000,
      'analysis': 10000,
      'chat': 3000
    };
    
    const base = baseDurations[task.type] || 5000;
    
    // Adjust based on content complexity
    let complexity = 1;
    if (task.code && task.code.length > 1000) complexity += 0.5;
    if (task.prompt && task.prompt.length > 500) complexity += 0.3;
    
    return Math.round(base * complexity);
  }

  /**
   * Determine task priority
   */
  private determinePriority(task: AgentTask): 'high' | 'medium' | 'low' {
    const highPriorityTasks = ['debugging', 'security', 'deployment'];
    const mediumPriorityTasks = ['code_generation', 'testing', 'architecture'];
    
    if (highPriorityTasks.includes(task.type)) return 'high';
    if (mediumPriorityTasks.includes(task.type)) return 'medium';
    return 'low';
  }

  /**
   * Identify task dependencies
   */
  private identifyDependencies(task: AgentTask): string[] {
    const dependencies: string[] = [];
    
    if (task.type === 'testing' && task.code) {
      dependencies.push('code_generation');
    }
    
    if (task.type === 'deployment') {
      dependencies.push('testing', 'security');
    }
    
    if (task.type === 'performance' && task.code) {
      dependencies.push('code_review');
    }
    
    return dependencies;
  }

  /**
   * Update service statistics
   */
  private updateServiceStats(service: string, success: boolean, responseTime: number) {
    if (!this.serviceStats.has(service)) {
      this.serviceStats.set(service, { success: 0, failure: 0, avgResponseTime: 0 });
    }
    
    const stats = this.serviceStats.get(service)!;
    
    if (success) {
      stats.success++;
    } else {
      stats.failure++;
    }
    
    // Update average response time
    const totalRequests = stats.success + stats.failure;
    stats.avgResponseTime = (stats.avgResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Get service statistics
   */
  getServiceStats(): Map<string, { success: number; failure: number; avgResponseTime: number }> {
    return new Map(this.serviceStats);
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(): Map<AgentName, string[]> {
    return new Map(this.agentCapabilities);
  }

  /**
   * Check if A2A framework is available
   */
  async isAvailable(): Promise<boolean> {
    return await this.a2aService.isAvailable();
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus() {
    return await this.a2aService.getHealthStatus();
  }

  /**
   * Intelligent query that automatically selects the best service
   */
  async intelligentQuery(query: string, context?: Record<string, any>): Promise<A2AExecutionResult> {
    const task: AgentTask = {
      type: 'general_query',
      prompt: query,
      message: query
    };
    
    return await this.executeTask(task, undefined, context);
  }
}

// Default export for easy importing
export default A2AAgentDirector;