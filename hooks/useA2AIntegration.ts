/**
 * A2A Integration Hook
 * Provides A2A framework integration for the project orchestrator
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AgentName, AgentTask, A2ASession } from '../types';
import { A2AAgentDirector } from '../services/a2aAgentDirector';
import { A2AService } from '../services/a2aService';

export interface A2AIntegrationState {
  isA2AAvailable: boolean;
  isA2AInitialized: boolean;
  activeSession: A2ASession | null;
  serviceHealth: Record<string, any>;
  lastError: string | null;
}

export interface A2AIntegrationActions {
  initializeA2A: () => Promise<boolean>;
  executeA2ATask: (task: AgentTask, agent?: AgentName, context?: Record<string, any>) => Promise<any>;
  orchestrateMultiAgentTask: (task: AgentTask, agents: AgentName[], context?: Record<string, any>) => Promise<any[]>;
  intelligentQuery: (query: string, context?: Record<string, any>) => Promise<any>;
  checkA2AHealth: () => Promise<void>;
  getA2AStats: () => Promise<any>;
  resetA2A: () => void;
}

export interface A2AIntegrationOptions {
  autoInitialize?: boolean;
  healthCheckInterval?: number;
  retryAttempts?: number;
  fallbackToMockResponses?: boolean;
}

export const useA2AIntegration = (options: A2AIntegrationOptions = {}): [A2AIntegrationState, A2AIntegrationActions] => {
  const {
    autoInitialize = true,
    healthCheckInterval = 60000, // 1 minute
    retryAttempts = 3,
    fallbackToMockResponses = true
  } = options;

  // State
  const [state, setState] = useState<A2AIntegrationState>({
    isA2AAvailable: false,
    isA2AInitialized: false,
    activeSession: null,
    serviceHealth: {},
    lastError: null
  });

  // Services
  const a2aDirectorRef = useRef<A2AAgentDirector | null>(null);
  const a2aServiceRef = useRef<A2AService | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initializationPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Initialize A2A services
   */
  const initializeA2A = useCallback(async (): Promise<boolean> => {
    // Return existing initialization promise if already initializing
    if (initializationPromiseRef.current) {
      return initializationPromiseRef.current;
    }

    initializationPromiseRef.current = (async () => {
      try {
        console.log('🎯 Initializing A2A framework...');
        
        // Initialize services
        a2aDirectorRef.current = new A2AAgentDirector();
        a2aServiceRef.current = new A2AService();
        
        // Check if A2A framework is available
        const isAvailable = await a2aDirectorRef.current.isAvailable();
        
        if (isAvailable) {
          console.log('✅ A2A framework is available');
          
          // Get initial health status
          const health = await a2aDirectorRef.current.getHealthStatus();
          
          setState(prev => ({
            ...prev,
            isA2AAvailable: true,
            isA2AInitialized: true,
            serviceHealth: health,
            lastError: null
          }));
          
          return true;
        } else {
          console.log('⚠️  A2A framework is not available');
          
          setState(prev => ({
            ...prev,
            isA2AAvailable: false,
            isA2AInitialized: false,
            lastError: 'A2A framework is not available'
          }));
          
          return false;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ A2A initialization failed:', errorMessage);
        
        setState(prev => ({
          ...prev,
          isA2AAvailable: false,
          isA2AInitialized: false,
          lastError: errorMessage
        }));
        
        return false;
      } finally {
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  }, []);

  /**
   * Execute an A2A task
   */
  const executeA2ATask = useCallback(async (
    task: AgentTask,
    agent?: AgentName,
    context?: Record<string, any>
  ): Promise<any> => {
    if (!a2aDirectorRef.current) {
      if (fallbackToMockResponses) {
        return generateMockResponse(task, agent);
      }
      throw new Error('A2A framework not initialized');
    }

    try {
      const result = await a2aDirectorRef.current.executeTask(task, agent, context);
      
      if (!result.success) {
        if (fallbackToMockResponses) {
          console.log('⚠️  A2A task failed, using mock response');
          return generateMockResponse(task, agent);
        }
        throw new Error(result.error || 'A2A task execution failed');
      }
      
      return result.result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ A2A task execution error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      
      if (fallbackToMockResponses) {
        return generateMockResponse(task, agent);
      }
      
      throw error;
    }
  }, [fallbackToMockResponses]);

  /**
   * Orchestrate multi-agent task
   */
  const orchestrateMultiAgentTask = useCallback(async (
    task: AgentTask,
    agents: AgentName[],
    context?: Record<string, any>
  ): Promise<any[]> => {
    if (!a2aDirectorRef.current) {
      if (fallbackToMockResponses) {
        return agents.map(agent => generateMockResponse(task, agent));
      }
      throw new Error('A2A framework not initialized');
    }

    try {
      const results = await a2aDirectorRef.current.orchestrateMultiAgentTask(task, agents, context);
      
      const responses = results.map(result => {
        if (!result.success && fallbackToMockResponses) {
          return generateMockResponse(task, result.agent);
        }
        return result.result;
      });
      
      return responses;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ A2A orchestration error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      
      if (fallbackToMockResponses) {
        return agents.map(agent => generateMockResponse(task, agent));
      }
      
      throw error;
    }
  }, [fallbackToMockResponses]);

  /**
   * Intelligent query
   */
  const intelligentQuery = useCallback(async (
    query: string,
    context?: Record<string, any>
  ): Promise<any> => {
    if (!a2aDirectorRef.current) {
      if (fallbackToMockResponses) {
        return generateMockQueryResponse(query);
      }
      throw new Error('A2A framework not initialized');
    }

    try {
      const result = await a2aDirectorRef.current.intelligentQuery(query, context);
      
      if (!result.success) {
        if (fallbackToMockResponses) {
          return generateMockQueryResponse(query);
        }
        throw new Error(result.error || 'A2A query failed');
      }
      
      return result.result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ A2A query error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        lastError: errorMessage
      }));
      
      if (fallbackToMockResponses) {
        return generateMockQueryResponse(query);
      }
      
      throw error;
    }
  }, [fallbackToMockResponses]);

  /**
   * Check A2A health
   */
  const checkA2AHealth = useCallback(async (): Promise<void> => {
    if (!a2aDirectorRef.current) return;

    try {
      const health = await a2aDirectorRef.current.getHealthStatus();
      const isAvailable = await a2aDirectorRef.current.isAvailable();
      
      setState(prev => ({
        ...prev,
        isA2AAvailable: isAvailable,
        serviceHealth: health,
        lastError: null
      }));
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ A2A health check error:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isA2AAvailable: false,
        lastError: errorMessage
      }));
    }
  }, []);

  /**
   * Get A2A statistics
   */
  const getA2AStats = useCallback(async (): Promise<any> => {
    if (!a2aDirectorRef.current || !a2aServiceRef.current) {
      return {
        services: 0,
        healthyServices: 0,
        stats: {},
        capabilities: {}
      };
    }

    try {
      const [serviceStats, capabilities, healthStatus] = await Promise.all([
        a2aDirectorRef.current.getServiceStats(),
        a2aDirectorRef.current.getAgentCapabilities(),
        a2aDirectorRef.current.getHealthStatus()
      ]);

      return {
        services: Object.keys(healthStatus).length,
        healthyServices: Object.values(healthStatus).filter((h: any) => h.status === 'healthy').length,
        stats: Object.fromEntries(serviceStats),
        capabilities: Object.fromEntries(capabilities),
        health: healthStatus
      };
      
    } catch (error) {
      console.error('❌ A2A stats error:', error);
      return {
        services: 0,
        healthyServices: 0,
        stats: {},
        capabilities: {}
      };
    }
  }, []);

  /**
   * Reset A2A state
   */
  const resetA2A = useCallback((): void => {
    // Clear interval
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    // Reset refs
    a2aDirectorRef.current = null;
    a2aServiceRef.current = null;
    initializationPromiseRef.current = null;

    // Reset state
    setState({
      isA2AAvailable: false,
      isA2AInitialized: false,
      activeSession: null,
      serviceHealth: {},
      lastError: null
    });
  }, []);

  /**
   * Auto-initialize on mount
   */
  useEffect(() => {
    if (autoInitialize) {
      initializeA2A();
    }
  }, [autoInitialize, initializeA2A]);

  /**
   * Setup health check interval
   */
  useEffect(() => {
    if (state.isA2AInitialized && healthCheckInterval > 0) {
      healthCheckIntervalRef.current = setInterval(checkA2AHealth, healthCheckInterval);
    }

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [state.isA2AInitialized, healthCheckInterval, checkA2AHealth]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      resetA2A();
    };
  }, [resetA2A]);

  const actions: A2AIntegrationActions = {
    initializeA2A,
    executeA2ATask,
    orchestrateMultiAgentTask,
    intelligentQuery,
    checkA2AHealth,
    getA2AStats,
    resetA2A
  };

  return [state, actions];
};

/**
 * Generate mock response for fallback
 */
function generateMockResponse(task: AgentTask, agent?: AgentName): any {
  const mockResponses: Record<string, any> = {
    'code_generation': {
      generatedCode: `// Mock ${task.language || 'javascript'} code\nfunction mockFunction() {\n  // Generated by ${agent || 'A2A Mock'}\n  return 'Hello World';\n}`,
      language: task.language || 'javascript',
      mock: true
    },
    'code_explanation': {
      explanation: `Mock explanation for the provided code:\n\nThis code appears to be a ${task.language || 'javascript'} implementation that performs basic operations. The function is well-structured and follows standard conventions.`,
      mock: true
    },
    'debugging': {
      debug: `Mock debugging analysis:\n\nThe issue appears to be related to: ${task.error || 'unknown error'}\n\nSuggested fixes:\n1. Check variable declarations\n2. Verify function calls\n3. Add error handling`,
      mock: true
    },
    'architecture': {
      architecture: `Mock architectural guidance:\n\nRecommended architecture:\n1. Use microservices pattern\n2. Implement API-first approach\n3. Consider scalability requirements\n4. Apply security best practices`,
      mock: true
    },
    'chat': {
      response: `Mock response: I understand your query "${task.message || task.prompt}". Based on the context, here's my analysis and recommendations.`,
      mock: true
    }
  };

  return mockResponses[task.type] || {
    result: `Mock response for task type: ${task.type}`,
    mock: true
  };
}

/**
 * Generate mock query response
 */
function generateMockQueryResponse(query: string): any {
  return {
    response: `Mock response for query: "${query}"\n\nThis is a comprehensive analysis of your question. Based on the context provided, here are my insights and recommendations.`,
    query,
    mock: true
  };
}

export default useA2AIntegration;