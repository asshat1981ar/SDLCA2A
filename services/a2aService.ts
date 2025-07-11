/**
 * A2A Service Layer
 * Integrates with the A2A Master Bridge to provide unified AI service access
 */

import { AgentTask, AgentName } from '../types';

export interface A2ARequest {
  service: 'blackbox' | 'claude-web' | 'gemini-cli' | 'claude-code' | 'deepseek';
  agent: AgentName;
  task: AgentTask;
  context?: Record<string, any>;
  sessionId?: string;
}

export interface A2AResponse {
  success: boolean;
  result?: any;
  error?: string;
  agent?: AgentName;
  sessionId?: string;
  timestamp?: string;
}

export interface A2AOrchestrationRequest {
  task: AgentTask;
  agents: AgentName[];
  context?: Record<string, any>;
}

export interface A2AOrchestrationResponse {
  success: boolean;
  sessionId?: string;
  results?: Array<{
    agent: AgentName;
    service: string;
    result?: any;
    error?: string;
    timestamp: string;
  }>;
  duration?: number;
  error?: string;
}

export interface A2AHealthStatus {
  [serviceName: string]: {
    status: 'healthy' | 'unhealthy' | 'unreachable' | 'error' | 'stopped' | 'external';
    lastCheck?: Date;
    error?: string;
    responseTime?: number;
    exitCode?: number;
  };
}

export interface A2ABridgeInfo {
  [serviceName: string]: {
    name: string;
    port: number;
    url: string;
    description: string;
    status: string;
    health?: A2AHealthStatus[string];
  };
}

export class A2AService {
  private masterBridgeUrl: string;
  private healthCache: A2AHealthStatus = {};
  private bridgeCache: A2ABridgeInfo = {};
  private lastHealthCheck: Date | null = null;
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor(masterBridgeUrl: string = 'http://localhost:3000') {
    this.masterBridgeUrl = masterBridgeUrl;
  }

  /**
   * Route a request to a specific AI service
   */
  async routeToService(request: A2ARequest): Promise<A2AResponse> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/route`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          service: request.service,
          request: {
            agent: request.agent,
            task: request.task,
            context: request.context,
            sessionId: request.sessionId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ A2A route error for ${request.service}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agent: request.agent,
        sessionId: request.sessionId,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Orchestrate a multi-agent, multi-service task
   */
  async orchestrateTask(request: A2AOrchestrationRequest): Promise<A2AOrchestrationResponse> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ A2A orchestration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get health status of all A2A services
   */
  async getHealthStatus(forceRefresh: boolean = false): Promise<A2AHealthStatus> {
    const now = new Date();
    
    if (!forceRefresh && this.lastHealthCheck && 
        (now.getTime() - this.lastHealthCheck.getTime()) < this.healthCheckInterval) {
      return this.healthCache;
    }

    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.healthCache = data;
      this.lastHealthCheck = now;
      
      return data;
    } catch (error) {
      console.error('❌ A2A health check error:', error);
      return this.healthCache;
    }
  }

  /**
   * Get information about all available bridges
   */
  async getBridgeInfo(): Promise<A2ABridgeInfo> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/bridges`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.bridgeCache = data;
      
      return data;
    } catch (error) {
      console.error('❌ A2A bridge info error:', error);
      return this.bridgeCache;
    }
  }

  /**
   * Check if the A2A master bridge is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the optimal service for a given agent and task
   */
  getOptimalService(agent: AgentName, task: AgentTask): string {
    // Agent-based routing
    const agentServiceMap: Record<string, string> = {
      'Frontend Expert': 'blackbox',
      'Backend Expert': 'claude-web',
      'Claude Code': 'claude-code',
      'Debugger': 'claude-web',
      'Senior Architect': 'gemini-cli',
      'DevOps Engineer': 'deepseek',
      'Software Architect': 'gemini-cli',
      'Full-Stack Developer': 'blackbox',
      'UI/UX Expert': 'blackbox',
      'QA Engineer': 'claude-web',
      'Security Analyst': 'claude-web',
      'DB Architect': 'deepseek',
    };

    // Task-based routing
    const taskServiceMap: Record<string, string> = {
      'code_generation': 'blackbox',
      'code_explanation': 'claude-web',
      'code_review': 'claude-code',
      'debugging': 'claude-web',
      'architecture': 'gemini-cli',
      'deployment': 'deepseek',
      'testing': 'claude-web',
      'security': 'claude-web',
      'database': 'deepseek',
      'ui_design': 'blackbox',
      'performance': 'claude-web',
      'refactoring': 'claude-code',
    };

    // Priority: Agent-based > Task-based > Default
    return agentServiceMap[agent] || taskServiceMap[task.type] || 'claude-code';
  }

  /**
   * Create a new A2A session
   */
  async createSession(sessionData: Record<string, any>): Promise<string | null> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/sessions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.sessionId;
    } catch (error) {
      console.error('❌ A2A session creation error:', error);
      return null;
    }
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<any | null> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/sessions/${sessionId}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.session;
    } catch (error) {
      console.error('❌ A2A session get error:', error);
      return null;
    }
  }

  /**
   * Intelligent multi-service query
   * Automatically routes to the best service based on query type
   */
  async intelligentQuery(query: string, context?: Record<string, any>): Promise<A2AResponse> {
    // Analyze query to determine optimal service
    const service = this.analyzeQueryForService(query);
    
    const task: AgentTask = {
      type: 'chat',
      message: query,
      prompt: query,
    };

    const agent = this.getOptimalAgent(service);

    return await this.routeToService({
      service: service as any,
      agent,
      task,
      context,
    });
  }

  /**
   * Analyze query content to determine optimal service
   */
  private analyzeQueryForService(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Code-related queries
    if (lowerQuery.includes('code') || lowerQuery.includes('function') || 
        lowerQuery.includes('javascript') || lowerQuery.includes('python') ||
        lowerQuery.includes('typescript') || lowerQuery.includes('programming')) {
      if (lowerQuery.includes('generate') || lowerQuery.includes('create')) {
        return 'blackbox';
      }
      if (lowerQuery.includes('explain') || lowerQuery.includes('debug')) {
        return 'claude-web';
      }
      return 'claude-code';
    }

    // Architecture queries
    if (lowerQuery.includes('architecture') || lowerQuery.includes('design') ||
        lowerQuery.includes('system') || lowerQuery.includes('scalability')) {
      return 'gemini-cli';
    }

    // Deployment/DevOps queries
    if (lowerQuery.includes('deploy') || lowerQuery.includes('docker') ||
        lowerQuery.includes('kubernetes') || lowerQuery.includes('devops')) {
      return 'deepseek';
    }

    // Default to Claude for general queries
    return 'claude-web';
  }

  /**
   * Get optimal agent for a service
   */
  private getOptimalAgent(service: string): AgentName {
    const serviceAgentMap: Record<string, AgentName> = {
      'blackbox': 'Frontend Expert',
      'claude-web': 'Claude Code',
      'claude-code': 'Claude Code',
      'gemini-cli': 'Senior Architect',
      'deepseek': 'DevOps Engineer',
    };

    return serviceAgentMap[service] || 'Claude Code';
  }

  /**
   * Batch process multiple requests
   */
  async batchProcess(requests: A2ARequest[]): Promise<A2AResponse[]> {
    const promises = requests.map(request => this.routeToService(request));
    return await Promise.all(promises);
  }

  /**
   * Get service statistics
   */
  async getServiceStats(): Promise<Record<string, any>> {
    try {
      const [health, bridges] = await Promise.all([
        this.getHealthStatus(),
        this.getBridgeInfo(),
      ]);

      const stats = {
        totalServices: Object.keys(bridges).length,
        healthyServices: Object.values(health).filter(h => h.status === 'healthy').length,
        availableServices: Object.keys(bridges).filter(name => bridges[name].status === 'running').length,
        services: Object.keys(bridges).map(name => ({
          name,
          status: health[name]?.status || 'unknown',
          port: bridges[name]?.port,
          description: bridges[name]?.description,
        })),
      };

      return stats;
    } catch (error) {
      console.error('❌ A2A stats error:', error);
      return {
        totalServices: 0,
        healthyServices: 0,
        availableServices: 0,
        services: [],
      };
    }
  }
}

// Default export for easy importing
export default A2AService;