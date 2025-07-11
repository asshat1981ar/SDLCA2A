#!/usr/bin/env node

/**
 * A2A System Startup Script
 * Orchestrates the startup of all A2A bridges and services
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class A2AMasterBridge {
  constructor() {
    this.processes = new Map();
    this.startupOrder = [
      {
        name: 'A2A Master Bridge',
        script: './a2a-master-bridge-optimized.cjs',
        port: 3000,
        color: '\x1b[36m', // Cyan
        dependencies: []
      },
      {
        name: 'Blackbox Bridge',
        script: './blackbox-bridge.cjs',
        port: 3003,
        color: '\x1b[34m', // Blue
        dependencies: []
      },
      {
        name: 'Claude Web Bridge',
        script: './claude-web-bridge.cjs',
        port: 3004,
        color: '\x1b[35m', // Magenta
        dependencies: []
      },
      {
        name: 'Gemini CLI Bridge',
        script: './gemini-cli-bridge.cjs',
        port: 3005,
        color: '\x1b[33m', // Yellow
        dependencies: []
      }
    ];
  }

  log(message, color = '\x1b[0m') {
    const timestamp = new Date().toISOString();
    console.log(`${color}[${timestamp}] ${message}\x1b[0m`);
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const { exec } = require('child_process');
      exec(`lsof -i :${port}`, (error, stdout, stderr) => {
        resolve(stdout.trim().length > 0);
      });
    });
  }

  async waitForPort(port, timeout = 30000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const isOpen = await this.checkPort(port);
      if (isOpen) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return false;
  }

  async startService(config) {
    const { name, script, port, color, dependencies } = config;
    
    this.log(`Starting ${name}...`, color);
    
    // Check if script exists
    const scriptPath = path.join(__dirname, script);
    if (!fs.existsSync(scriptPath)) {
      this.log(`❌ Script not found: ${script}`, '\x1b[31m');
      return false;
    }

    // Check if port is already in use
    const portInUse = await this.checkPort(port);
    if (portInUse) {
      this.log(`⚠️  Port ${port} already in use for ${name}`, '\x1b[33m');
      return true; // Consider it successful if already running
    }

    // Start the service
    const process = spawn('node', [scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BRIDGE_PORT: port }
    });

    // Handle output
    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        this.log(`[${name}] ${line}`, color);
      });
    });

    process.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        this.log(`[${name}] ERROR: ${line}`, '\x1b[31m');
      });
    });

    process.on('exit', (code) => {
      this.log(`${name} exited with code ${code}`, code === 0 ? '\x1b[32m' : '\x1b[31m');
      this.processes.delete(name);
    });

    // Store process
    this.processes.set(name, process);

    // Wait for service to be ready
    const isReady = await this.waitForPort(port, 10000);
    if (isReady) {
      this.log(`✅ ${name} started successfully on port ${port}`, '\x1b[32m');
      return true;
    } else {
      this.log(`❌ ${name} failed to start on port ${port}`, '\x1b[31m');
      return false;
    }
  }

  async startAllBridges() {
    this.log('🚀 Starting A2A Framework...', '\x1b[36m');
    
    // Check if dependencies are installed
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      this.log('❌ package.json not found. Please run from the project root.', '\x1b[31m');
      process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const requiredDeps = ['ws', 'express', 'cors'];
    
    for (const dep of requiredDeps) {
      if (!packageJson.dependencies[dep]) {
        this.log(`❌ Missing dependency: ${dep}. Please run: npm install ${dep}`, '\x1b[31m');
        process.exit(1);
      }
    }

    // Start services in order
    const results = [];
    for (const config of this.startupOrder) {
      const success = await this.startService(config);
      results.push({ name: config.name, success });
      
      if (!success) {
        this.log(`❌ Failed to start ${config.name}`, '\x1b[31m');
      }
      
      // Wait a bit between services
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Summary
    this.log('\n📊 A2A Framework Startup Summary:', '\x1b[36m');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const color = result.success ? '\x1b[32m' : '\x1b[31m';
      this.log(`${status} ${result.name}`, color);
    });

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      this.log(`\n🎉 All ${totalCount} services started successfully!`, '\x1b[32m');
      this.log('🌐 A2A Master Bridge: http://localhost:3000/api/a2a/health', '\x1b[36m');
      this.log('📊 Bridge Status: http://localhost:3000/api/a2a/bridges', '\x1b[36m');
    } else {
      this.log(`\n⚠️  ${successCount}/${totalCount} services started successfully`, '\x1b[33m');
    }

    // Keep process alive
    this.log('\n🔄 A2A Framework is running. Press Ctrl+C to stop all services.', '\x1b[36m');
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      this.shutdown();
    });
  }

  async shutdown() {
    this.log('\n🛑 Shutting down A2A Framework...', '\x1b[36m');
    
    const shutdownPromises = [];
    
    for (const [name, process] of this.processes) {
      this.log(`Stopping ${name}...`, '\x1b[33m');
      shutdownPromises.push(
        new Promise((resolve) => {
          process.on('exit', resolve);
          process.kill('SIGTERM');
          
          // Force kill after 5 seconds
          setTimeout(() => {
            process.kill('SIGKILL');
            resolve();
          }, 5000);
        })
      );
    }
    
    await Promise.all(shutdownPromises);
    this.log('✅ All services stopped', '\x1b[32m');
    process.exit(0);
  }

  async status() {
    this.log('📊 A2A Framework Status:', '\x1b[36m');
    
    for (const config of this.startupOrder) {
      const isRunning = await this.checkPort(config.port);
      const status = isRunning ? '✅ Running' : '❌ Stopped';
      const color = isRunning ? '\x1b[32m' : '\x1b[31m';
      this.log(`${status} ${config.name} (Port ${config.port})`, color);
    }
  }
}

// CLI handling
const command = process.argv[2];
const startup = new A2AMasterBridge();

switch (command) {
  case 'start':
    startup.startAllBridges();
    break;
  case 'status':
    startup.status();
    break;
  case 'stop':
    startup.shutdown();
    break;
  default:
    console.log(`
🎯 A2A Framework Control

Usage: node start-a2a.js [command]

Commands:
  start   - Start all A2A services
  status  - Check status of all services
  stop    - Stop all services

Examples:
  node start-a2a.js start
  node start-a2a.js status
  node start-a2a.js stop
`);
    process.exit(1);
}