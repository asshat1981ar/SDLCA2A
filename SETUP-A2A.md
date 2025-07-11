# A2A Framework Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Required for Gemini CLI Bridge
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Custom bridge ports
A2A_MASTER_PORT=3000
BLACKBOX_BRIDGE_PORT=3003
CLAUDE_WEB_BRIDGE_PORT=3004
GEMINI_CLI_BRIDGE_PORT=3005
```

### 3. Start the A2A Framework
```bash
# Start all A2A services
node start-a2a.js start

# Check status
node start-a2a.js status

# Run tests
node test-a2a.js test
```

### 4. Access the Application
- Main Application: `http://localhost:5173`
- A2A Master Bridge: `http://localhost:3000/api/a2a/health`
- Bridge Status: `http://localhost:3000/api/a2a/bridges`

## Detailed Installation

### Prerequisites
- Node.js 18+ with npm
- Git
- Internet connection for AI services
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Step 1: Dependencies
The following dependencies are required:

**Browser Automation:**
- `puppeteer` - For Blackbox.ai and Claude Pro web automation
- `playwright` - Alternative browser automation (optional)

**Networking:**
- `ws` - WebSocket support for real-time communication
- `express` - Web server framework
- `cors` - Cross-origin resource sharing

**AI Integration:**
- `@google/genai` - Google Gemini AI integration

Install all dependencies:
```bash
npm install puppeteer playwright ws express cors @google/genai
```

### Step 2: Browser Setup
The A2A framework uses headless browsers for web automation. Ensure browsers are properly installed:

```bash
# Install Chromium for Puppeteer
npx puppeteer browsers install chrome

# Install browsers for Playwright (optional)
npx playwright install
```

### Step 3: API Keys
Obtain API keys for the services you want to use:

**Gemini AI (Required for Gemini CLI Bridge):**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to `.env` file: `GEMINI_API_KEY=your_key_here`

**Blackbox.ai (For Pro features):**
- Account with Pro subscription
- Login credentials for web automation

**Claude Pro (For Pro features):**
- Account with Pro subscription  
- Login credentials for web automation

### Step 4: Configuration
Update the configuration files as needed:

**Port Configuration:**
```javascript
// start-a2a.js - Update bridge ports if needed
const bridgeConfigs = [
  { name: 'A2A Master Bridge', port: 3000 },
  { name: 'Blackbox Bridge', port: 3003 },
  { name: 'Claude Web Bridge', port: 3004 },
  { name: 'Gemini CLI Bridge', port: 3005 }
];
```

**Service Configuration:**
```typescript
// services/a2aService.ts - Update master bridge URL if needed
const masterBridgeUrl = 'http://localhost:3000';
```

### Step 5: Starting Services
Start the A2A framework in the correct order:

```bash
# Option 1: Use the startup script (recommended)
node start-a2a.js start

# Option 2: Manual startup
node a2a-master-bridge.cjs &
node blackbox-bridge.cjs &
node claude-web-bridge.cjs &
node gemini-cli-bridge.cjs &
```

### Step 6: Verification
Verify all services are running:

```bash
# Check service status
node start-a2a.js status

# Run comprehensive tests
node test-a2a.js test

# Check health endpoints
curl http://localhost:3000/api/a2a/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
```

## Integration with Existing Application

### Step 1: Update Orchestrator
The A2A framework is designed to integrate with your existing orchestrator:

```typescript
// In your component or service
import { enhancedOrchestrator } from './services/enhancedOrchestrator';

// Initialize the enhanced orchestrator
await enhancedOrchestrator.initialize();

// Use A2A-enhanced methods
const result = await enhancedOrchestrator.generateCode(file, plan);
```

### Step 2: Update Agent System
The A2A framework adds new agent types:

```typescript
// types.ts - Already updated with new agents
export type AgentName = 'Orchestrator' | 'Market Analyst' | 'Product Strategist' | 
'Frontend Expert' | 'Backend Expert' | 'DB Architect' | 'QA Engineer' | 'Debugger' | 
'Senior Architect' | 'DevOps Engineer' | 'Security Analyst' | 'Software Architect' | 
'Full-Stack Developer' | 'UI/UX Expert' | 'Claude Code' | 'A2A Agent Director' | 
'Blackbox AI Agent' | 'Claude Pro Agent' | 'Gemini CLI Agent';
```

### Step 3: Update UI Components
The A2A Agent Panel is already integrated with the MultiAgentView:

```typescript
// components/MultiAgentView.tsx - Already updated
import A2AAgentPanel from './A2AAgentPanel.tsx';

// A2A panel is automatically displayed in the agent view
```

### Step 4: Use A2A Hooks
Integrate A2A functionality in your components:

```typescript
// In your React component
import { useA2AIntegration } from './hooks/useA2AIntegration';

const [a2aState, a2aActions] = useA2AIntegration();

// Use A2A functions
const result = await a2aActions.executeA2ATask(task, agent, context);
```

## Service Configuration

### Blackbox.ai Bridge
The Blackbox.ai bridge provides code generation capabilities:

**Supported Operations:**
- Code generation
- Code explanation
- Code review
- Chat interface

**Configuration:**
```javascript
// blackbox-bridge.cjs
const bridge = new BlackboxBridge();
// Automatically handles login and session management
```

### Claude Pro Bridge
The Claude Pro bridge provides advanced AI capabilities:

**Supported Operations:**
- Code explanation
- Debugging assistance
- Code refactoring
- Analysis tasks

**Configuration:**
```javascript
// claude-web-bridge.cjs
const bridge = new ClaudeWebBridge();
// Requires Claude Pro subscription
```

### Gemini CLI Bridge
The Gemini CLI bridge provides architectural guidance:

**Supported Operations:**
- Architecture recommendations
- General queries
- Analysis tasks
- System design

**Configuration:**
```javascript
// gemini-cli-bridge.cjs
const bridge = new GeminiCLIBridge();
// Requires GEMINI_API_KEY environment variable
```

## Troubleshooting

### Common Issues

**1. Services Not Starting**
```bash
# Check port availability
lsof -i :3000
lsof -i :3003
lsof -i :3004
lsof -i :3005

# Kill processes using ports
kill -9 $(lsof -t -i :3000)
```

**2. Browser Automation Issues**
```bash
# Install missing browsers
npx puppeteer browsers install chrome
npx playwright install

# Check browser installation
which google-chrome
which chromium
```

**3. API Key Issues**
```bash
# Verify environment variables
echo $GEMINI_API_KEY

# Check API key validity
curl -H "Authorization: Bearer $GEMINI_API_KEY" \
  https://generativelanguage.googleapis.com/v1/models
```

**4. Network Issues**
```bash
# Check connectivity
ping google.com
ping claude.ai
ping blackbox.ai

# Check firewall settings
sudo ufw status
```

### Debug Mode
Enable debug mode for detailed logging:

```bash
# Start with debug logging
DEBUG=a2a:* node start-a2a.js start

# Or set environment variable
export DEBUG=a2a:*
node start-a2a.js start
```

### Log Files
Check log files for errors:

```bash
# View logs
tail -f logs/a2a-master.log
tail -f logs/blackbox-bridge.log
tail -f logs/claude-web-bridge.log
tail -f logs/gemini-cli-bridge.log
```

## Performance Optimization

### 1. Browser Optimization
```javascript
// Optimize browser settings
const browser = await puppeteer.launch({
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--memory-pressure-off'
  ]
});
```

### 2. Connection Pooling
```javascript
// Use connection pooling for better performance
const poolSize = 5;
const browserPool = new Array(poolSize).fill(null);
```

### 3. Caching
```javascript
// Enable response caching
const cache = new Map();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes
```

## Security Considerations

### 1. Credential Management
- Never store credentials in code
- Use environment variables
- Implement secure credential storage

### 2. Network Security
- Bind services to localhost only
- Use HTTPS where possible
- Implement rate limiting

### 3. Browser Security
- Run browsers in sandboxed mode
- Disable unnecessary features
- Monitor resource usage

## Monitoring and Maintenance

### 1. Health Checks
```bash
# Automated health checks
*/5 * * * * curl -f http://localhost:3000/api/a2a/health || exit 1
```

### 2. Performance Monitoring
```javascript
// Monitor response times
const responseTime = Date.now() - startTime;
if (responseTime > 30000) {
  console.warn('Slow response detected:', responseTime);
}
```

### 3. Error Monitoring
```javascript
// Log errors for monitoring
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

## Advanced Configuration

### 1. Custom Bridge Development
Create your own bridge following the template:

```javascript
// custom-bridge.cjs
const express = require('express');
const cors = require('cors');

class CustomBridge {
  constructor() {
    this.app = express();
    this.port = process.env.BRIDGE_PORT || 3006;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'custom-bridge' });
    });
  }

  async start() {
    this.app.listen(this.port, () => {
      console.log(`Custom Bridge running on port ${this.port}`);
    });
  }
}

module.exports = CustomBridge;
```

### 2. Load Balancing
```javascript
// Implement load balancing across multiple instances
const instances = [
  'http://localhost:3003',
  'http://localhost:3013',
  'http://localhost:3023'
];

const currentInstance = instances[Math.floor(Math.random() * instances.length)];
```

### 3. Clustering
```javascript
// Use Node.js clustering for better performance
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // Start bridge
  const bridge = new A2AMasterBridge();
  bridge.start();
}
```

## Support and Troubleshooting

### Getting Help
1. Check the troubleshooting section
2. Review log files for errors
3. Run the test suite
4. Check GitHub issues
5. Contact support

### Reporting Issues
When reporting issues, include:
- Operating system and version
- Node.js version
- Error messages and logs
- Steps to reproduce
- Configuration details

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## Conclusion

The A2A Framework provides a powerful orchestration layer for integrating multiple AI services with your existing application. Follow this guide to set up and configure the framework for your specific needs.

For additional help and support, please refer to the main documentation or contact the development team.