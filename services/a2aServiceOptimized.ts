/**
 * A2A Service Layer - Performance Optimized
 * Enhanced with caching, connection pooling, and performance monitoring
 */

import { AgentName, AgentTask, A2ASession } from '../types';

export interface A2ARequestOptimized {
  service: 'blackbox' | 'claude-web' | 'gemini-cli' | 'claude-code' | 'deepseek';
  agent: AgentName;
  task: AgentTask;
  context?: Record<string, any>;
  sessionId?: string;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  cacheKey?: string;
}

export interface A2AResponseOptimized {
  success: boolean;
  result?: any;
  error?: string;
  agent?: AgentName;
  sessionId?: string;
  timestamp?: string;
  cached?: boolean;
  responseTime?: number;
  fromFallback?: boolean;
}

export interface A2AMetrics {
  requestCount: number;
  errorCount: number;
  errorRate: number;
  avgResponseTime: number;
  cacheHitRate: number;
  memoryUsage?: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  uptime: number;
}

export interface A2APerformanceConfig {
  enableCaching: boolean;
  cacheSize: number;
  cacheTTL: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

class RequestCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(private maxSize: number = 1000) {
    this.cache = new Map();
  }

  generateKey(request: A2ARequestOptimized): string {
    return JSON.stringify({
      service: request.service,
      agent: request.agent,
      task: request.task,
      context: request.context
    });
  }

  get(request: A2ARequestOptimized): any | null {
    const key = request.cacheKey || this.generateKey(request);
    const cached = this.cache.get(key);
    
    if (!cached) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    this.hitCount++;
    return cached.data;
  }

  set(request: A2ARequestOptimized, data: any, ttl: number = 300000): void {
    const key = request.cacheKey || this.generateKey(request);
    
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, value] of this.cache) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

class RequestQueue {
  private queue: Array<{
    request: A2ARequestOptimized;
    resolve: (value: A2AResponseOptimized) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private processing: Set<string> = new Set();
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  async add(request: A2ARequestOptimized): Promise<A2AResponseOptimized> {
    return new Promise((resolve, reject) => {
      const queueItem = {
        request,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      if (request.priority === 'high') {
        this.queue.unshift(queueItem);
      } else {
        this.queue.push(queueItem);
      }
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    const item = this.queue.shift();
    if (!item) return;
    
    const requestId = Math.random().toString(36).substr(2, 9);
    this.processing.add(requestId);
    
    try {
      const result = await this.executeRequest(item.request);
      item.resolve(result);
    } catch (error) {
      item.reject(error instanceof Error ? error : new Error('Unknown error'));
    } finally {
      this.processing.delete(requestId);
      this.processQueue(); // Process next item
    }
  }

  private async executeRequest(request: A2ARequestOptimized): Promise<A2AResponseOptimized> {
    // This would be implemented by the service using this queue
    throw new Error('executeRequest must be implemented by subclass');
  }
}

export class A2AServiceOptimized {
  private masterBridgeUrl: string;
  private cache: RequestCache;
  private requestQueue: RequestQueue;
  private config: A2APerformanceConfig;
  private metrics: {
    requestCount: number;
    errorCount: number;
    responseTime: number[];
    startTime: number;
  };

  constructor(
    masterBridgeUrl: string = 'http://localhost:3000',
    config: Partial<A2APerformanceConfig> = {}
  ) {
    this.masterBridgeUrl = masterBridgeUrl;
    this.config = {
      enableCaching: true,
      cacheSize: 1000,
      cacheTTL: 300000, // 5 minutes
      maxConcurrentRequests: 10,
      requestTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
    
    this.cache = new RequestCache(this.config.cacheSize);
    this.requestQueue = new RequestQueue(this.config.maxConcurrentRequests);
    
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      responseTime: [],
      startTime: Date.now()
    };
  }

  /**
   * Route a request to a specific AI service with optimizations
   */
  async routeToService(request: A2ARequestOptimized): Promise<A2AResponseOptimized> {
    const startTime = Date.now();
    this.metrics.requestCount++;
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cachedResult = this.cache.get(request);
        if (cachedResult) {
          return {
            success: true,
            result: cachedResult,
            agent: request.agent,
            sessionId: request.sessionId,
            timestamp: new Date().toISOString(),
            cached: true,
            responseTime: Date.now() - startTime
          };
        }
      }
      
      // Execute request with retry logic
      const result = await this.executeWithRetry(request);
      
      // Cache the result
      if (this.config.enableCaching && result.success) {
        this.cache.set(request, result.result, this.config.cacheTTL);
      }
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);
      
      return {
        ...result,
        responseTime,
        cached: false
      };
      
    } catch (error) {
      this.metrics.errorCount++;
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        agent: request.agent,
        sessionId: request.sessionId,
        timestamp: new Date().toISOString(),
        responseTime,
        cached: false
      };
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(request: A2ARequestOptimized): Promise<A2AResponseOptimized> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.executeRequest(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute the actual request
   */
  private async executeRequest(request: A2ARequestOptimized): Promise<A2AResponseOptimized> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), request.timeout || this.config.requestTimeout);
    
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
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
      
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Orchestrate a multi-agent, multi-service task with optimizations
   */
  async orchestrateTask(
    task: AgentTask,
    agents: AgentName[],
    context?: Record<string, any>
  ): Promise<A2AResponseOptimized[]> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);
      
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          agents,
          context,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Orchestration failed');
      }

      return data.results?.map((result: any) => ({
        success: !result.error,
        result: result.result,
        error: result.error,
        responseTime: Date.now() - startTime,
        agent: result.agent,
        sessionId: data.sessionId,
        timestamp: result.timestamp,
        cached: false
      })) || [];
      
    } catch (error) {
      this.metrics.errorCount++;
      
      return [{
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
        agent: 'A2A Agent Director',
        timestamp: new Date().toISOString(),
        cached: false
      }];
    }
  }

  /**
   * Intelligent query with automatic optimization
   */
  async intelligentQuery(
    query: string,
    context?: Record<string, any>,
    options: { priority?: 'high' | 'medium' | 'low'; timeout?: number } = {}
  ): Promise<A2AResponseOptimized> {
    const service = this.analyzeQueryForService(query);
    const agent = this.getOptimalAgent(service);
    
    const task: AgentTask = {
      type: 'general_query',
      prompt: query,
      message: query,
    };

    return await this.routeToService({
      service: service as any,
      agent,
      task,
      context,
      priority: options.priority || 'medium',
      timeout: options.timeout
    });
  }

  /**
   * Batch process multiple requests with optimization
   */
  async batchProcess(requests: A2ARequestOptimized[]): Promise<A2AResponseOptimized[]> {
    // Group requests by priority
    const highPriority = requests.filter(r => r.priority === 'high');
    const mediumPriority = requests.filter(r => r.priority === 'medium');
    const lowPriority = requests.filter(r => r.priority === 'low');
    
    // Process high priority first, then medium, then low
    const results: A2AResponseOptimized[] = [];
    
    for (const batch of [highPriority, mediumPriority, lowPriority]) {
      if (batch.length > 0) {
        const batchPromises = batch.map(request => this.routeToService(request));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
    }
    
    return results;
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<A2AMetrics> {
    try {
      const response = await fetch(`${this.masterBridgeUrl}/api/a2a/metrics`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Fallback to local metrics
    }
    
    // Return local metrics if remote not available
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    return {
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      cacheHitRate: this.cache.getHitRate(),
      uptime: (Date.now() - this.metrics.startTime) / 1000
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<A2APerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update cache size if needed
    if (newConfig.cacheSize && newConfig.cacheSize !== this.config.cacheSize) {
      this.cache = new RequestCache(newConfig.cacheSize);
    }
  }

  /**
   * Check if A2A framework is available
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

  // Private helper methods
  private updateMetrics(responseTime: number): void {
    this.metrics.responseTime.push(responseTime);
    
    // Keep only last 1000 response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private analyzeQueryForService(query: string): string {
    const lowerQuery = query.toLowerCase();

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

    if (lowerQuery.includes('architecture') || lowerQuery.includes('design') ||
        lowerQuery.includes('system') || lowerQuery.includes('scalability')) {
      return 'gemini-cli';
    }

    if (lowerQuery.includes('deploy') || lowerQuery.includes('docker') ||
        lowerQuery.includes('kubernetes') || lowerQuery.includes('devops')) {
      return 'deepseek';
    }

    return 'claude-web';
  }

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
}

export default A2AServiceOptimized;