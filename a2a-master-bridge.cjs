/**
 * A2A Master Bridge Orchestration Service
 * Coordinates multiple AI service bridges and agent-to-agent communication
 * Port: 3000 (Master orchestrator)
 * 
 * Bridge Architecture:
 * - Blackbox.ai Bridge (Port 3003)
 * - Claude-Code Bridge (Port 3004) 
 * - Gemini-CLI Bridge (Port 3005)
 * - Existing: Claude Code Bridge (Port 3001)
 * - Existing: DeepSeek Bridge (Port 3002)
 */

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class A2AMasterBridge {
  constructor() {
    this.app = express();
    this.port = 3000;
    
    // Bridge registry
    this.bridges = new Map();
    this.bridgeProcesses = new Map();
    
    // Session management for A2A communication
    this.sessions = new Map();
    
    // Health monitoring
    this.healthStatus = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupHealthMonitoring();
  }

  setupMiddleware() {
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
    
    // Bridge management endpoints
    this.app.post('/api/bridges/start', this.startBridge.bind(this));
    this.app.post('/api/bridges/stop', this.stopBridge.bind(this));
    this.app.post('/api/bridges/restart', this.restartBridge.bind(this));
    
    // Session management
    this.app.post('/api/sessions/create', this.createSession.bind(this));
    this.app.get('/api/sessions/:id', this.getSession.bind(this));
    this.app.delete('/api/sessions/:id', this.deleteSession.bind(this));
  }

  setupHealthMonitoring() {
    // Monitor bridge health every 30 seconds
    setInterval(() => {
      this.checkBridgeHealth();
    }, 30000);
  }

  async startAllBridges() {
    console.log('🚀 Starting A2A Master Bridge Orchestration Service...');
    
    // Bridge configurations
    const bridgeConfigs = [
      {
        name: 'blackbox',
        port: 3003,
        script: './blackbox-bridge.cjs',
        description: 'Blackbox.ai Web Automation Bridge'
      },
      {
        name: 'claude-web',
        port: 3004,
        script: './claude-web-bridge.cjs',
        description: 'Claude Pro Web Automation Bridge'
      },
      {
        name: 'gemini-cli',
        port: 3005,
        script: './gemini-cli-bridge.cjs',
        description: 'Gemini CLI Automation Bridge'
      }
    ];

    // Register existing bridges
    this.registerExistingBridges();

    // Start new A2A bridges
    for (const config of bridgeConfigs) {
      try {
        await this.startBridge(config);
        console.log(`✅ ${config.description} started on port ${config.port}`);
      } catch (error) {
        console.error(`❌ Failed to start ${config.name} bridge:`, error.message);
        this.healthStatus.set(config.name, { status: 'error', error: error.message });
      }
    }
  }

  registerExistingBridges() {
    // Register existing bridges from the current system
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

  async startBridge(config) {
    return new Promise((resolve, reject) => {
      // Check if bridge script exists
      const scriptPath = path.join(__dirname, config.script);
      if (!fs.existsSync(scriptPath)) {
        return reject(new Error(`Bridge script not found: ${config.script}`));
      }

      // Spawn bridge process
      const bridgeProcess = spawn('node', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, BRIDGE_PORT: config.port }
      });

      // Handle process events
      bridgeProcess.on('error', (error) => {
        console.error(`❌ Bridge ${config.name} error:`, error);
        this.healthStatus.set(config.name, { status: 'error', error: error.message });
        reject(error);
      });

      bridgeProcess.on('exit', (code) => {
        console.log(`⚠️  Bridge ${config.name} exited with code ${code}`);
        this.bridges.delete(config.name);
        this.bridgeProcesses.delete(config.name);
        this.healthStatus.set(config.name, { status: 'stopped', exitCode: code });
      });

      // Wait for bridge to be ready
      setTimeout(async () => {
        try {
          const isReady = await this.checkBridgeReady(config);
          if (isReady) {
            this.bridges.set(config.name, {
              ...config,
              url: `http://localhost:${config.port}`,
              status: 'running'
            });
            this.bridgeProcesses.set(config.name, bridgeProcess);
            this.healthStatus.set(config.name, { status: 'healthy', lastCheck: new Date() });
            resolve(config);
          } else {
            reject(new Error(`Bridge ${config.name} failed to start`));
          }
        } catch (error) {
          reject(error);
        }
      }, 2000);
    });
  }

  async checkBridgeReady(config) {
    try {
      const response = await fetch(`http://localhost:${config.port}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async orchestrateA2ATask(req, res) {
    try {
      const { task, agents, context } = req.body;
      
      console.log(`🎯 Orchestrating A2A task: ${task.type}`);
      
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
      
      // Route task to appropriate services
      const results = await this.executeA2ATask(session);
      
      // Update session
      session.status = 'completed';
      session.endTime = new Date();
      session.results = results;
      
      res.json({
        success: true,
        sessionId,
        results,
        duration: session.endTime - session.startTime
      });
      
    } catch (error) {
      console.error('❌ A2A orchestration error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async executeA2ATask(session) {
    const { task, agents, context } = session;
    const results = [];
    
    // Intelligent task routing based on agent capabilities
    for (const agent of agents) {
      const serviceName = this.getOptimalServiceForAgent(agent, task);
      
      if (serviceName && this.bridges.has(serviceName)) {
        try {
          const result = await this.routeToService(serviceName, {
            agent,
            task,
            context,
            sessionId: session.id
          });
          
          results.push({
            agent,
            service: serviceName,
            result,
            timestamp: new Date()
          });
          
        } catch (error) {
          console.error(`❌ Error routing to ${serviceName}:`, error);
          results.push({
            agent,
            service: serviceName,
            error: error.message,
            timestamp: new Date()
          });
        }
      }
    }
    
    return results;
  }

  getOptimalServiceForAgent(agent, task) {
    // Intelligent service selection based on agent type and task
    const agentServiceMap = {
      'Frontend Expert': 'blackbox',
      'Backend Expert': 'claude-web',
      'Claude Code': 'claude-code',
      'Debugger': 'claude-web',
      'Senior Architect': 'gemini-cli',
      'DevOps Engineer': 'deepseek'
    };
    
    // Task-based routing
    const taskServiceMap = {
      'code_generation': 'blackbox',
      'code_explanation': 'claude-web',
      'code_review': 'claude-code',
      'debugging': 'claude-web',
      'architecture': 'gemini-cli',
      'deployment': 'deepseek'
    };
    
    return agentServiceMap[agent] || taskServiceMap[task.type] || 'claude-code';
  }

  async routeToService(serviceName, request) {
    const bridge = this.bridges.get(serviceName);
    if (!bridge) {
      throw new Error(`Bridge ${serviceName} not available`);
    }
    
    const response = await fetch(`${bridge.url}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error(`Bridge ${serviceName} returned ${response.status}`);
    }
    
    return await response.json();
  }

  async routeRequest(req, res) {
    try {
      const { service, request } = req.body;
      const result = await this.routeToService(service, request);
      res.json({ success: true, result });
    } catch (error) {
      console.error('❌ Route request error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async checkBridgeHealth() {
    for (const [name, bridge] of this.bridges) {
      try {
        const response = await fetch(`${bridge.url}/health`, { timeout: 5000 });
        this.healthStatus.set(name, {
          status: response.ok ? 'healthy' : 'unhealthy',
          lastCheck: new Date(),
          responseTime: Date.now()
        });
      } catch (error) {
        this.healthStatus.set(name, {
          status: 'unreachable',
          lastCheck: new Date(),
          error: error.message
        });
      }
    }
  }

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

  async startBridge(req, res) {
    try {
      const { name, script, port, description } = req.body;
      const config = { name, script, port, description };
      await this.startBridge(config);
      res.json({ success: true, message: `Bridge ${name} started successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async stopBridge(req, res) {
    try {
      const { name } = req.body;
      const process = this.bridgeProcesses.get(name);
      if (process) {
        process.kill();
        this.bridges.delete(name);
        this.bridgeProcesses.delete(name);
        res.json({ success: true, message: `Bridge ${name} stopped successfully` });
      } else {
        res.status(404).json({ success: false, error: 'Bridge not found' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async restartBridge(req, res) {
    try {
      const { name } = req.body;
      const bridge = this.bridges.get(name);
      if (bridge) {
        await this.stopBridge(req, { json: () => {} });
        await this.startBridge(bridge);
        res.json({ success: true, message: `Bridge ${name} restarted successfully` });
      } else {
        res.status(404).json({ success: false, error: 'Bridge not found' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async start() {
    try {
      await this.startAllBridges();
      
      this.app.listen(this.port, () => {
        console.log(`🎯 A2A Master Bridge Orchestration Service running on port ${this.port}`);
        console.log(`🌐 Health endpoint: http://localhost:${this.port}/api/a2a/health`);
        console.log(`📊 Bridges endpoint: http://localhost:${this.port}/api/a2a/bridges`);
      });
      
    } catch (error) {
      console.error('❌ Failed to start A2A Master Bridge:', error);
      process.exit(1);
    }
  }
}

// Start the A2A Master Bridge if run directly
if (require.main === module) {
  const masterBridge = new A2AMasterBridge();
  masterBridge.start();
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 Shutting down A2A Master Bridge...');
    process.exit(0);
  });
}

module.exports = A2AMasterBridge;