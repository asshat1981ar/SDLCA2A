/**
 * A2A Optimized Utilities
 * Performance-optimized utilities for A2A framework
 */

class ConnectionPool {
  constructor(maxConnections = 5) {
    this.maxConnections = maxConnections;
    this.connections = new Map();
    this.activeConnections = 0;
    this.waitingQueue = [];
  }

  async getConnection(service) {
    if (this.connections.has(service)) {
      return this.connections.get(service);
    }

    if (this.activeConnections >= this.maxConnections) {
      return new Promise(resolve => {
        this.waitingQueue.push({ service, resolve });
      });
    }

    const connection = await this.createConnection(service);
    this.connections.set(service, connection);
    this.activeConnections++;
    return connection;
  }

  async createConnection(service) {
    // Mock connection creation
    return {
      service,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isActive: true
    };
  }

  releaseConnection(service) {
    if (this.connections.has(service)) {
      this.activeConnections--;
      
      if (this.waitingQueue.length > 0) {
        const { service: waitingService, resolve } = this.waitingQueue.shift();
        this.getConnection(waitingService).then(resolve);
      }
    }
  }
}

class ResponseCache {
  constructor(maxSize = 1000, ttl = 300000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.accessTimes = new Map();
  }

  generateKey(request) {
    return JSON.stringify({
      service: request.service,
      task: request.task,
      agent: request.agent
    });
  }

  get(request) {
    const key = this.generateKey(request);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return null;
    }
    
    this.accessTimes.set(key, Date.now());
    return cached.data;
  }

  set(request, data) {
    const key = this.generateKey(request);
    
    if (this.cache.size >= this.maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    this.accessTimes.set(key, Date.now());
  }

  evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.accessTimes.clear();
  }
}

class BrowserSessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 600000; // 10 minutes
    this.cleanupInterval = 60000; // 1 minute
    this.startCleanupTimer();
  }

  async getSession(service) {
    const session = this.sessions.get(service);
    
    if (session && session.isActive && Date.now() - session.lastUsed < this.sessionTimeout) {
      session.lastUsed = Date.now();
      return session;
    }
    
    if (session) {
      await this.closeSession(service);
    }
    
    return await this.createSession(service);
  }

  async createSession(service) {
    const session = {
      service,
      id: Math.random().toString(36).substr(2, 9),
      isActive: true,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      browser: null, // Will be set when browser is launched
      page: null     // Will be set when page is created
    };
    
    this.sessions.set(service, session);
    return session;
  }

  async closeSession(service) {
    const session = this.sessions.get(service);
    if (session) {
      session.isActive = false;
      if (session.browser) {
        try {
          await session.browser.close();
        } catch (error) {
          console.error(`Error closing browser for ${service}:`, error);
        }
      }
      this.sessions.delete(service);
    }
  }

  startCleanupTimer() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    
    for (const [service, session] of this.sessions) {
      if (now - session.lastUsed > this.sessionTimeout) {
        console.log(`Cleaning up expired session for ${service}`);
        await this.closeSession(service);
      }
    }
  }
}

class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

class MemoryMonitor {
  constructor() {
    this.memoryThreshold = 100 * 1024 * 1024; // 100MB
    this.checkInterval = 30000; // 30 seconds
    this.callbacks = [];
    this.startMonitoring();
  }

  addCallback(callback) {
    this.callbacks.push(callback);
  }

  startMonitoring() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      
      if (memoryUsage.heapUsed > this.memoryThreshold) {
        console.warn(`High memory usage detected: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);
        
        this.callbacks.forEach(callback => {
          try {
            callback(memoryUsage);
          } catch (error) {
            console.error('Error in memory callback:', error);
          }
        });
      }
    }, this.checkInterval);
  }

  forceGarbageCollection() {
    if (global.gc) {
      global.gc();
      console.log('Garbage collection forced');
    }
  }
}

class LazyLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadPromises = new Map();
  }

  async load(moduleName, loader) {
    if (this.loadedModules.has(moduleName)) {
      return this.loadedModules.get(moduleName);
    }

    if (this.loadPromises.has(moduleName)) {
      return this.loadPromises.get(moduleName);
    }

    const loadPromise = loader();
    this.loadPromises.set(moduleName, loadPromise);

    try {
      const module = await loadPromise;
      this.loadedModules.set(moduleName, module);
      this.loadPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadPromises.delete(moduleName);
      throw error;
    }
  }

  unload(moduleName) {
    this.loadedModules.delete(moduleName);
    this.loadPromises.delete(moduleName);
  }
}

class PerformanceProfiler {
  constructor() {
    this.metrics = new Map();
    this.startTimes = new Map();
  }

  start(operation) {
    this.startTimes.set(operation, Date.now());
  }

  end(operation) {
    const startTime = this.startTimes.get(operation);
    if (!startTime) return;

    const duration = Date.now() - startTime;
    this.startTimes.delete(operation);

    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalTime += duration;
    metric.avgTime = metric.totalTime / metric.count;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
  }

  getMetrics() {
    const result = {};
    for (const [operation, metric] of this.metrics) {
      result[operation] = { ...metric };
    }
    return result;
  }

  reset() {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

module.exports = {
  ConnectionPool,
  ResponseCache,
  BrowserSessionManager,
  CircuitBreaker,
  MemoryMonitor,
  LazyLoader,
  PerformanceProfiler
};