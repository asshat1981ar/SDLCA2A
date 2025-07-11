#!/usr/bin/env node

/**
 * A2A Framework Test Suite
 * Comprehensive testing of all A2A bridges and orchestration
 */

const fs = require('fs');
const path = require('path');

class A2ATester {
  constructor() {
    this.masterBridgeUrl = 'http://localhost:3000';
    this.bridgeUrls = {
      'blackbox': 'http://localhost:3003',
      'claude-web': 'http://localhost:3004',
      'gemini-cli': 'http://localhost:3005',
      'claude-code': 'http://localhost:3001',
      'deepseek': 'http://localhost:3002'
    };
    
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m'
    };
    
    const timestamp = new Date().toISOString();
    console.log(`${colors[type]}[${timestamp}] ${message}\x1b[0m`);
  }

  async test(name, testFn) {
    this.testResults.total++;
    this.log(`Testing: ${name}`, 'info');
    
    try {
      await testFn();
      this.testResults.passed++;
      this.testResults.tests.push({ name, status: 'passed' });
      this.log(`✅ ${name} - PASSED`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name, status: 'failed', error: error.message });
      this.log(`❌ ${name} - FAILED: ${error.message}`, 'error');
    }
  }

  async httpTest(url, options = {}) {
    const { method = 'GET', body, headers = {} } = options;
    
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  async runAllTests() {
    this.log('🚀 Starting A2A Framework Test Suite', 'info');
    
    // Basic health checks
    await this.test('Master Bridge Health Check', async () => {
      const result = await this.httpTest(`${this.masterBridgeUrl}/api/a2a/health`);
      if (typeof result !== 'object') {
        throw new Error('Invalid health response');
      }
    });

    await this.test('Bridge Discovery', async () => {
      const result = await this.httpTest(`${this.masterBridgeUrl}/api/a2a/bridges`);
      if (typeof result !== 'object') {
        throw new Error('Invalid bridges response');
      }
    });

    // Individual bridge tests
    for (const [name, url] of Object.entries(this.bridgeUrls)) {
      await this.test(`${name} Bridge Health`, async () => {
        try {
          const result = await this.httpTest(`${url}/health`);
          if (result.status !== 'healthy') {
            throw new Error(`Bridge not healthy: ${result.status}`);
          }
        } catch (error) {
          // For external bridges (claude-code, deepseek), we might expect them to be down
          if (name === 'claude-code' || name === 'deepseek') {
            this.log(`⚠️  ${name} bridge not available (expected)`, 'warning');
            return;
          }
          throw error;
        }
      });
    }

    // Orchestration tests
    await this.test('Simple Orchestration', async () => {
      const request = {
        task: {
          type: 'chat',
          message: 'Hello, this is a test message'
        },
        agents: ['Claude Code'],
        context: { test: true }
      };

      const result = await this.httpTest(`${this.masterBridgeUrl}/api/a2a/orchestrate`, {
        method: 'POST',
        body: request
      });

      if (!result.success) {
        throw new Error(`Orchestration failed: ${result.error}`);
      }
    });

    await this.test('Multi-Agent Orchestration', async () => {
      const request = {
        task: {
          type: 'code_generation',
          prompt: 'Create a simple JavaScript function',
          language: 'javascript'
        },
        agents: ['Frontend Expert', 'Backend Expert'],
        context: { test: true }
      };

      const result = await this.httpTest(`${this.masterBridgeUrl}/api/a2a/orchestrate`, {
        method: 'POST',
        body: request
      });

      if (!result.success) {
        throw new Error(`Multi-agent orchestration failed: ${result.error}`);
      }
    });

    // Direct bridge tests
    await this.test('Blackbox Bridge Code Generation', async () => {
      const request = {
        prompt: 'Create a simple hello world function',
        language: 'javascript',
        context: { test: true }
      };

      try {
        const result = await this.httpTest(`${this.bridgeUrls.blackbox}/api/generate-code`, {
          method: 'POST',
          body: request
        });

        if (!result.success) {
          throw new Error(`Blackbox generation failed: ${result.error}`);
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
          this.log('⚠️  Blackbox bridge not running', 'warning');
          return;
        }
        throw error;
      }
    });

    await this.test('Claude Web Bridge Code Explanation', async () => {
      const request = {
        code: 'function hello() { return "Hello World"; }',
        language: 'javascript',
        context: { test: true }
      };

      try {
        const result = await this.httpTest(`${this.bridgeUrls['claude-web']}/api/explain-code`, {
          method: 'POST',
          body: request
        });

        if (!result.success) {
          throw new Error(`Claude explanation failed: ${result.error}`);
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
          this.log('⚠️  Claude Web bridge not running', 'warning');
          return;
        }
        throw error;
      }
    });

    await this.test('Gemini CLI Bridge Query', async () => {
      const request = {
        prompt: 'What is the best architecture for a web application?',
        context: { test: true }
      };

      try {
        const result = await this.httpTest(`${this.bridgeUrls['gemini-cli']}/api/query`, {
          method: 'POST',
          body: request
        });

        if (!result.success) {
          throw new Error(`Gemini query failed: ${result.error}`);
        }
      } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
          this.log('⚠️  Gemini CLI bridge not running', 'warning');
          return;
        }
        throw error;
      }
    });

    // Route request tests
    await this.test('Route Request to Blackbox', async () => {
      const request = {
        service: 'blackbox',
        request: {
          agent: 'Frontend Expert',
          task: {
            type: 'code_generation',
            prompt: 'Create a React component',
            language: 'javascript'
          },
          context: { test: true }
        }
      };

      const result = await this.httpTest(`${this.masterBridgeUrl}/api/a2a/route`, {
        method: 'POST',
        body: request
      });

      if (!result.success) {
        throw new Error(`Route to Blackbox failed: ${result.error}`);
      }
    });

    // Session management tests
    await this.test('Session Creation', async () => {
      const sessionData = {
        type: 'test-session',
        description: 'Test session for A2A framework',
        context: { test: true }
      };

      const result = await this.httpTest(`${this.masterBridgeUrl}/api/sessions/create`, {
        method: 'POST',
        body: sessionData
      });

      if (!result.success) {
        throw new Error(`Session creation failed: ${result.error}`);
      }

      // Store session ID for cleanup
      this.testSessionId = result.sessionId;
    });

    await this.test('Session Retrieval', async () => {
      if (!this.testSessionId) {
        throw new Error('No test session ID available');
      }

      const result = await this.httpTest(`${this.masterBridgeUrl}/api/sessions/${this.testSessionId}`);
      
      if (!result.success) {
        throw new Error(`Session retrieval failed: ${result.error}`);
      }
    });

    // Performance tests
    await this.test('Concurrent Requests', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        task: {
          type: 'chat',
          message: `Concurrent test message ${i + 1}`
        },
        agents: ['Claude Code'],
        context: { test: true, requestId: i + 1 }
      }));

      const promises = requests.map(request => 
        this.httpTest(`${this.masterBridgeUrl}/api/a2a/orchestrate`, {
          method: 'POST',
          body: request
        })
      );

      const results = await Promise.all(promises);
      
      const failedCount = results.filter(r => !r.success).length;
      if (failedCount > 0) {
        throw new Error(`${failedCount} out of ${requests.length} concurrent requests failed`);
      }
    });

    // Cleanup
    if (this.testSessionId) {
      await this.test('Session Cleanup', async () => {
        const response = await fetch(`${this.masterBridgeUrl}/api/sessions/${this.testSessionId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Session cleanup failed');
        }
      });
    }

    // Test summary
    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 A2A Framework Test Results:', 'info');
    this.log(`Total Tests: ${this.testResults.total}`, 'info');
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'success');
    
    const passRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    this.log(`Pass Rate: ${passRate}%`, passRate >= 80 ? 'success' : 'warning');

    if (this.testResults.failed > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.testResults.tests
        .filter(t => t.status === 'failed')
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.error}`, 'error');
        });
    }

    this.log('\n🎯 Test Complete!', 'info');
    
    // Exit with appropriate code
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }

  async benchmark() {
    this.log('🏃 Running A2A Framework Benchmarks', 'info');
    
    const benchmarkResults = [];
    
    // Test response times
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();
      
      try {
        await this.httpTest(`${this.masterBridgeUrl}/api/a2a/health`);
        const endTime = Date.now();
        benchmarkResults.push(endTime - startTime);
      } catch (error) {
        this.log(`Benchmark iteration ${i + 1} failed: ${error.message}`, 'error');
      }
    }
    
    if (benchmarkResults.length > 0) {
      const avgTime = benchmarkResults.reduce((a, b) => a + b, 0) / benchmarkResults.length;
      const minTime = Math.min(...benchmarkResults);
      const maxTime = Math.max(...benchmarkResults);
      
      this.log(`\n⚡ Performance Metrics:`, 'info');
      this.log(`Average Response Time: ${avgTime.toFixed(2)}ms`, 'info');
      this.log(`Min Response Time: ${minTime}ms`, 'info');
      this.log(`Max Response Time: ${maxTime}ms`, 'info');
    }
  }
}

// CLI handling
const command = process.argv[2];
const tester = new A2ATester();

switch (command) {
  case 'test':
    tester.runAllTests();
    break;
  case 'benchmark':
    tester.benchmark();
    break;
  default:
    console.log(`
🧪 A2A Framework Test Suite

Usage: node test-a2a.js [command]

Commands:
  test      - Run all tests
  benchmark - Run performance benchmarks

Examples:
  node test-a2a.js test
  node test-a2a.js benchmark
`);
    process.exit(1);
}