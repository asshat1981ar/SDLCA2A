/**
 * A2A Master Bridge - Performance Optimized Version
 * Port: 3000 (Master orchestrator)
 * 
 * Performance Optimizations:
 * - Connection pooling for bridge services
 * - Response caching for frequently requested data
 * - Circuit breaker pattern for external service calls
 * - Memory monitoring and cleanup
 * - Lazy loading of bridge services
 * - Performance profiling
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const {
  ConnectionPool,
  ResponseCache,
  BrowserSessionManager,
  CircuitBreaker,
  MemoryMonitor,
  LazyLoader,
  PerformanceProfiler
} = require('./utils/a2aOptimized.cjs');

class A2AMasterBridgeOptimized {
  constructor() {
    this.app = express();
    this.port = 3000;
    
    // Performance optimizations
    this.connectionPool = new ConnectionPool(10);
    this.responseCache = new ResponseCache(2000, 300000); // 2000 entries, 5 min TTL
    this.browserSessionManager = new BrowserSessionManager();
    this.circuitBreakers = new Map();
    this.memoryMonitor = new MemoryMonitor();
    this.lazyLoader = new LazyLoader();
    this.profiler = new PerformanceProfiler();
    
    // Bridge registry
    this.bridges = new Map();
    this.bridgeProcesses = new Map();
    
    // Session management
    this.sessions = new Map();
    
    // Health monitoring
    this.healthStatus = new Map();
    
    // Performance metrics
    this.metrics = {
      requestCount: 0,
      responseTime: [],
      errorCount: 0,
      cacheHitRate: 0,
      memoryUsage: []
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthMonitoring();
    this.setupPerformanceMonitoring();
    this.setupMemoryManagement();
  }

  setupMiddleware() {
    // Performance middleware
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      const operation = `${req.method} ${req.path}`;
      
      this.profiler.start(operation);
      this.metrics.requestCount++;
      
      res.on('finish', () => {
        this.profiler.end(operation);
        const responseTime = Date.now() - startTime;
        this.metrics.responseTime.push(responseTime);
        
        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime.shift();
        }
      });
      
      next();
    });

    this.app.use(cors({
      origin: ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:3002'],
      credentials: true
    }));
    
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // A2A orchestration endpoints
    this.app.post('/api/a2a/orchestrate', this.orchestrateA2ATask.bind(this));
    this.app.post('/api/a2a/route', this.routeRequest.bind(this));
    this.app.get('/api/a2a/health', this.getHealthStatus.bind(this));
    this.app.get('/api/a2a/bridges', this.listBridges.bind(this));
    this.app.get('/api/a2a/metrics', this.getMetrics.bind(this));
    this.app.get('/api/a2a/performance', this.getPerformanceMetrics.bind(this));
    
    // Bridge management endpoints
    this.app.post('/api/bridges/start', this.startBridge.bind(this));
    this.app.post('/api/bridges/stop', this.stopBridge.bind(this));
    this.app.post('/api/bridges/restart', this.restartBridge.bind(this));
    
    // Session management
    this.app.post('/api/sessions/create', this.createSession.bind(this));
    this.app.get('/api/sessions/:id', this.getSession.bind(this));
    this.app.delete('/api/sessions/:id', this.deleteSession.bind(this));
    
    // Performance endpoints
    this.app.post('/api/performance/clear-cache', this.clearCache.bind(this));
    this.app.post('/api/performance/gc', this.forceGarbageCollection.bind(this));
    this.app.get('/api/performance/profile', this.getProfileData.bind(this));
  }

  setupHealthMonitoring() {
    // Enhanced health monitoring with circuit breakers
    setInterval(() => {
      this.checkBridgeHealth();
    }, 15000); // Check every 15 seconds
  }

  setupPerformanceMonitoring() {
    // Collect performance metrics
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 30000); // Every 30 seconds
  }

  setupMemoryManagement() {
    // Memory monitoring
    this.memoryMonitor.addCallback((memoryUsage) => {
      console.warn('High memory usage detected, triggering cleanup...');
      this.performCleanup();
    });
    
    // Regular cleanup
    setInterval(() => {
      this.performCleanup();
    }, 300000); // Every 5 minutes
  }

  async orchestrateA2ATask(req, res) {
    const startTime = Date.now();
    
    try {
      const { task, agents, context } = req.body;
      
      // Check cache first
      const cacheKey = this.generateCacheKey(req.body);
      const cachedResult = this.responseCache.get({ service: 'orchestrate', task, agent: agents.join(',') });
      
      if (cachedResult) {
        this.updateCacheHitRate(true);
        return res.json({
          ...cachedResult,
          cached: true,
          responseTime: Date.now() - startTime
        });
      }
      
      this.updateCacheHitRate(false);
      
      console.log(`🎯 Orchestrating A2A task: ${task.type} (${agents.length} agents)`);
      
      // Create orchestration session
      const sessionId = this.generateSessionId();
      const session = {
        id: sessionId,
        task,
        agents,
        context,
        startTime: new Date(),
        status: 'running',
        results: []
      };
      
      this.sessions.set(sessionId, session);
      
      // Execute task with circuit breaker
      const results = await this.executeA2ATaskWithCircuitBreaker(session);
      
      // Update session
      session.status = 'completed';
      session.endTime = new Date();
      session.results = results;
      
      const response = {
        success: true,
        sessionId,
        results,
        duration: session.endTime - session.startTime,
        responseTime: Date.now() - startTime
      };
      
      // Cache the result
      this.responseCache.set({ service: 'orchestrate', task, agent: agents.join(',') }, response);
      
      res.json(response);
      
    } catch (error) {
      console.error('❌ A2A orchestration error:', error);
      this.metrics.errorCount++;
      
      res.status(500).json({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    }
  }

  async executeA2ATaskWithCircuitBreaker(session) {
    const { task, agents, context } = session;
    const results = [];
    
    // Process agents in parallel with circuit breakers
    const promises = agents.map(async (agent) => {
      const serviceName = this.getOptimalServiceForAgent(agent, task);
      
      if (!this.circuitBreakers.has(serviceName)) {
        this.circuitBreakers.set(serviceName, new CircuitBreaker(3, 60000));
      }
      
      const circuitBreaker = this.circuitBreakers.get(serviceName);
      
      try {
        const result = await circuitBreaker.execute(async () => {
          return await this.routeToServiceOptimized(serviceName, {
            agent,
            task,
            context,
            sessionId: session.id
          });
        });
        
        return {
          agent,
          service: serviceName,
          result,
          timestamp: new Date(),
          fromCache: false
        };
        
      } catch (error) {
        console.error(`❌ Error routing to ${serviceName}:`, error);
        
        // Try fallback service
        const fallbackService = this.getFallbackService(serviceName);
        if (fallbackService) {
          try {
            const fallbackResult = await this.routeToServiceOptimized(fallbackService, {
              agent,
              task,
              context,
              sessionId: session.id
            });
            
            return {
              agent,
              service: fallbackService,
              result: fallbackResult,
              timestamp: new Date(),
              fallback: true
            };
          } catch (fallbackError) {
            console.error(`❌ Fallback also failed:`, fallbackError);
          }
        }
        
        return {
          agent,
          service: serviceName,
          error: error.message,
          timestamp: new Date()
        };
      }
    });
    
    const results_array = await Promise.all(promises);
    return results_array;
  }

  async routeToServiceOptimized(serviceName, request) {
    // Use connection pool
    const connection = await this.connectionPool.getConnection(serviceName);
    
    try {
      const bridge = this.bridges.get(serviceName);
      if (!bridge) {
        throw new Error(`Bridge ${serviceName} not available`);
      }
      
      const response = await fetch(`${bridge.url}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        timeout: 30000
      });
      
      if (!response.ok) {
        throw new Error(`Bridge ${serviceName} returned ${response.status}`);
      }
      
      const data = await response.json();
      return data;
      
    } finally {
      // Release connection back to pool
      this.connectionPool.releaseConnection(serviceName);
    }
  }

  async routeRequest(req, res) {
    const startTime = Date.now();
    
    try {
      const { service, request } = req.body;
      
      // Check cache first
      const cachedResult = this.responseCache.get({ service, ...request });
      if (cachedResult) {
        this.updateCacheHitRate(true);
        return res.json({
          ...cachedResult,
          cached: true,
          responseTime: Date.now() - startTime
        });
      }
      
      this.updateCacheHitRate(false);
      
      const result = await this.routeToServiceOptimized(service, request);
      
      // Cache the result
      this.responseCache.set({ service, ...request }, result);
      
      res.json({
        success: true,
        result,
        responseTime: Date.now() - startTime
      });
      
    } catch (error) {
      console.error('❌ Route request error:', error);
      this.metrics.errorCount++;
      
      res.status(500).json({
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    }
  }

  async checkBridgeHealth() {
    const healthPromises = [];
    
    for (const [name, bridge] of this.bridges) {
      healthPromises.push(
        this.checkSingleBridgeHealth(name, bridge)
      );
    }
    
    await Promise.allSettled(healthPromises);
  }

  async checkSingleBridgeHealth(name, bridge) {
    try {
      const response = await fetch(`${bridge.url}/health`, { 
        timeout: 5000,
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now();
      
      this.healthStatus.set(name, {
        status: response.ok ? 'healthy' : 'unhealthy',
        lastCheck: new Date(),
        responseTime: responseTime,
        url: bridge.url
      });
      
    } catch (error) {
      this.healthStatus.set(name, {
        status: 'unreachable',
        lastCheck: new Date(),
        error: error.message,
        url: bridge.url
      });
    }
  }

  collectPerformanceMetrics() {
    const memoryUsage = process.memoryUsage();
    
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss
    });
    
    // Keep only last 100 memory measurements
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage.shift();
    }
  }

  performCleanup() {
    console.log('🧹 Performing cleanup...');
    
    // Clear old sessions
    const now = Date.now();
    const sessionTimeout = 3600000; // 1 hour
    
    for (const [sessionId, session] of this.sessions) {
      if (now - session.startTime > sessionTimeout) {
        this.sessions.delete(sessionId);
      }
    }
    
    // Clear old response times
    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime = this.metrics.responseTime.slice(-500);
    }
    
    // Clear old memory usage
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  updateCacheHitRate(isHit) {
    const totalRequests = this.metrics.requestCount;
    const currentHitRate = this.metrics.cacheHitRate;
    
    this.metrics.cacheHitRate = ((currentHitRate * (totalRequests - 1)) + (isHit ? 1 : 0)) / totalRequests;
  }

  generateCacheKey(data) {
    return JSON.stringify(data);
  }

  getFallbackService(serviceName) {
    const fallbackMap = {
      'blackbox': 'claude-code',
      'claude-web': 'claude-code',
      'gemini-cli': 'claude-code',
      'claude-code': 'deepseek'
    };
    
    return fallbackMap[serviceName];
  }

  getOptimalServiceForAgent(agent, task) {
    // Enhanced routing with performance considerations
    const agentServiceMap = {
      'Frontend Expert': 'blackbox',
      'Backend Expert': 'claude-web',
      'Claude Code': 'claude-code',
      'Debugger': 'claude-web',
      'Senior Architect': 'gemini-cli',
      'DevOps Engineer': 'deepseek'
    };
    
    const taskServiceMap = {
      'code_generation': 'blackbox',
      'code_explanation': 'claude-web',
      'code_review': 'claude-code',
      'debugging': 'claude-web',
      'architecture': 'gemini-cli',
      'deployment': 'deepseek'
    };
    
    const primaryService = agentServiceMap[agent] || taskServiceMap[task.type] || 'claude-code';
    
    // Check if primary service is healthy
    const healthStatus = this.healthStatus.get(primaryService);
    if (healthStatus && healthStatus.status !== 'healthy') {
      const fallbackService = this.getFallbackService(primaryService);
      if (fallbackService) {
        const fallbackHealth = this.healthStatus.get(fallbackService);
        if (fallbackHealth && fallbackHealth.status === 'healthy') {
          return fallbackService;
        }
      }
    }
    
    return primaryService;
  }

  // API Endpoints
  async getHealthStatus(req, res) {
    const status = {};
    for (const [name, health] of this.healthStatus) {
      status[name] = health;
    }
    res.json(status);
  }

  async listBridges(req, res) {
    const bridges = {};
    for (const [name, bridge] of this.bridges) {
      bridges[name] = {
        ...bridge,
        health: this.healthStatus.get(name)
      };
    }
    res.json(bridges);
  }

  async getMetrics(req, res) {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    const recentMemory = this.metrics.memoryUsage.length > 0 
      ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] 
      : null;
    
    res.json({
      requestCount: this.metrics.requestCount,
      errorCount: this.metrics.errorCount,
      errorRate: this.metrics.requestCount > 0 ? (this.metrics.errorCount / this.metrics.requestCount) * 100 : 0,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      cacheHitRate: Math.round(this.metrics.cacheHitRate * 100 * 100) / 100,
      memoryUsage: recentMemory ? {
        heapUsedMB: Math.round(recentMemory.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(recentMemory.heapTotal / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(recentMemory.rss / 1024 / 1024 * 100) / 100
      } : null,
      uptime: process.uptime()
    });
  }

  async getPerformanceMetrics(req, res) {
    const profileData = this.profiler.getMetrics();
    res.json({
      profileData,
      memoryUsage: this.metrics.memoryUsage,
      responseTime: this.metrics.responseTime.slice(-100) // Last 100 response times
    });
  }

  async clearCache(req, res) {
    this.responseCache.clear();
    res.json({ success: true, message: 'Cache cleared' });
  }

  async forceGarbageCollection(req, res) {
    if (global.gc) {
      global.gc();
      res.json({ success: true, message: 'Garbage collection forced' });
    } else {
      res.json({ success: false, message: 'Garbage collection not available' });
    }
  }

  async getProfileData(req, res) {
    const profileData = this.profiler.getMetrics();
    res.json(profileData);
  }

  generateSessionId() {
    return `a2a_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createSession(req, res) {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      ...req.body,
      createdAt: new Date(),
      status: 'created'
    };
    this.sessions.set(sessionId, session);
    res.json({ success: true, sessionId, session });
  }

  async getSession(req, res) {
    const { id } = req.params;
    const session = this.sessions.get(id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  }

  async deleteSession(req, res) {
    const { id } = req.params;
    const deleted = this.sessions.delete(id);
    res.json({ success: deleted });
  }

  async start() {
    try {
      console.log('🚀 Starting A2A Master Bridge (Optimized)...');
      
      // Register existing bridges
      this.registerExistingBridges();
      
      this.app.listen(this.port, () => {
        console.log(`🎯 A2A Master Bridge (Optimized) running on port ${this.port}`);
        console.log(`🌐 Health endpoint: http://localhost:${this.port}/api/a2a/health`);
        console.log(`📊 Metrics endpoint: http://localhost:${this.port}/api/a2a/metrics`);
        console.log(`⚡ Performance endpoint: http://localhost:${this.port}/api/a2a/performance`);
      });
      
    } catch (error) {
      console.error('❌ Failed to start A2A Master Bridge:', error);
      process.exit(1);
    }
  }

  registerExistingBridges() {
    const existingBridges = [
      {
        name: 'claude-code',
        port: 3001,
        url: 'http://localhost:3001',
        description: 'Claude Code CLI Bridge',
        status: 'external'
      },
      {
        name: 'deepseek',
        port: 3002,
        url: 'http://localhost:3002',
        description: 'DeepSeek AI Bridge',
        status: 'external'
      }
    ];

    for (const bridge of existingBridges) {
      this.bridges.set(bridge.name, bridge);
      this.healthStatus.set(bridge.name, { status: 'external', lastCheck: new Date() });
    }
  }
}

// Start the optimized A2A Master Bridge if run directly
if (require.main === module) {
  const masterBridge = new A2AMasterBridgeOptimized();
  masterBridge.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down A2A Master Bridge (Optimized)...');
    process.exit(0);
  });
}

module.exports = A2AMasterBridgeOptimized;