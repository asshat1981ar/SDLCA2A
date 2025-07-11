# A2A Framework - Application-to-Application AI Integration

## Overview

The A2A (Application-to-Application) Framework provides a unified orchestration layer for integrating multiple AI services with your existing MCP (Model Context Protocol) system. This framework enables seamless communication between different AI providers through browser automation and CLI bridges.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              A2A ORCHESTRATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                    Multi-Agent System (A1)                                 │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │   │
│  │  │ Orchestrator│ │Market Analyst│ │Frontend Expert│ │A2A Agent Director   │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                  A2A Bridge Orchestration Service (A2)                     │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │   │
│  │  │ Blackbox.ai     │ │ Claude-Code     │ │ Gemini-CLI      │               │   │
│  │  │ Bridge          │ │ Bridge          │ │ Bridge          │               │   │
│  │  │ (Port 3003)     │ │ (Port 3004)     │ │ (Port 3005)     │               │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
│                                        │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                     External AI Services (A3)                              │   │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │   │
│  │  │ Blackbox.ai     │ │ Claude Web      │ │ Gemini CLI      │               │   │
│  │  │ Web UI          │ │ Interface       │ │ Terminal        │               │   │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘               │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. A2A Master Bridge (Port 3000)
- **File**: `a2a-master-bridge.cjs`
- **Purpose**: Central orchestration hub for all AI services
- **Features**:
  - Intelligent task routing
  - Multi-agent coordination
  - Session management
  - Health monitoring
  - Load balancing

### 2. Blackbox.ai Bridge (Port 3003)
- **File**: `blackbox-bridge.cjs`
- **Purpose**: Web automation for Blackbox.ai Pro Plan
- **Features**:
  - Code generation
  - Code explanation
  - Code review
  - Chat interface
  - Browser automation with Puppeteer

### 3. Claude Pro Bridge (Port 3004)
- **File**: `claude-web-bridge.cjs`
- **Purpose**: Web automation for Claude Pro subscription
- **Features**:
  - Code explanation
  - Debugging assistance
  - Code refactoring
  - Advanced analysis
  - Browser automation with Puppeteer

### 4. Gemini CLI Bridge (Port 3005)
- **File**: `gemini-cli-bridge.cjs`
- **Purpose**: CLI automation for Gemini AI
- **Features**:
  - Architecture guidance
  - General queries
  - Analysis tasks
  - CLI command execution

### 5. A2A Service Layer
- **File**: `services/a2aService.ts`
- **Purpose**: TypeScript service layer for A2A integration
- **Features**:
  - Unified API interface
  - Intelligent service routing
  - Session management
  - Health monitoring

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Dependencies
```bash
npm install puppeteer playwright ws express cors @google/genai
```

### Setup
1. Clone the repository
2. Install dependencies
3. Configure environment variables
4. Start the A2A framework

## Configuration

### Environment Variables
```bash
# Gemini API Key (required for Gemini CLI Bridge)
GEMINI_API_KEY=your_gemini_api_key

# Optional: Custom bridge ports
A2A_MASTER_PORT=3000
BLACKBOX_BRIDGE_PORT=3003
CLAUDE_WEB_BRIDGE_PORT=3004
GEMINI_CLI_BRIDGE_PORT=3005
```

### Agent Configuration
The framework supports the following agent types:
- `A2A Agent Director` - Orchestrates cross-service interactions
- `Blackbox AI Agent` - Handles code generation tasks
- `Claude Pro Agent` - Manages code explanation and debugging
- `Gemini CLI Agent` - Provides architecture guidance

## Usage

### Starting the Framework
```bash
# Start all A2A services
node start-a2a.js start

# Check service status
node start-a2a.js status

# Stop all services
node start-a2a.js stop
```

### Testing
```bash
# Run all tests
node test-a2a.js test

# Run performance benchmarks
node test-a2a.js benchmark
```

### Using the A2A Service Layer
```typescript
import { A2AService } from './services/a2aService';

const a2aService = new A2AService();

// Simple query routing
const response = await a2aService.intelligentQuery(
  'Explain this JavaScript function',
  { code: 'function hello() { return "Hello World"; }' }
);

// Multi-agent orchestration
const result = await a2aService.orchestrateTask({
  task: {
    type: 'code_generation',
    prompt: 'Create a React component',
    language: 'javascript'
  },
  agents: ['Frontend Expert', 'Backend Expert'],
  context: { project: 'my-app' }
});

// Direct service routing
const codeExplanation = await a2aService.routeToService({
  service: 'claude-web',
  agent: 'Claude Pro Agent',
  task: {
    type: 'code_explanation',
    code: 'const x = 5;',
    language: 'javascript'
  }
});
```

## API Reference

### Master Bridge Endpoints

#### Health Check
```
GET /api/a2a/health
```
Returns health status of all bridges.

#### Orchestrate Task
```
POST /api/a2a/orchestrate
Body: {
  task: AgentTask,
  agents: AgentName[],
  context?: Record<string, any>
}
```
Orchestrates a multi-agent task across multiple AI services.

#### Route Request
```
POST /api/a2a/route
Body: {
  service: string,
  request: {
    agent: AgentName,
    task: AgentTask,
    context?: Record<string, any>
  }
}
```
Routes a request to a specific AI service.

#### List Bridges
```
GET /api/a2a/bridges
```
Returns information about all available bridges.

### Bridge-Specific Endpoints

#### Blackbox.ai Bridge
- `POST /api/generate-code` - Generate code
- `POST /api/explain-code` - Explain code
- `POST /api/review-code` - Review code
- `POST /api/chat` - Chat interface

#### Claude Pro Bridge
- `POST /api/explain-code` - Explain code
- `POST /api/debug-code` - Debug code
- `POST /api/refactor-code` - Refactor code
- `POST /api/analyze` - Analyze code

#### Gemini CLI Bridge
- `POST /api/query` - General queries
- `POST /api/analyze` - Analysis tasks
- `POST /api/architecture` - Architecture guidance

## Task Types

The framework supports the following task types:
- `code_generation` - Generate new code
- `code_explanation` - Explain existing code
- `code_review` - Review code for quality
- `debugging` - Debug code issues
- `refactoring` - Refactor code
- `testing` - Create tests
- `deployment` - Deployment guidance
- `architecture` - Architecture recommendations
- `security` - Security analysis
- `database` - Database design
- `ui_design` - UI/UX design
- `performance` - Performance optimization
- `general_query` - General questions
- `analysis` - Analysis tasks
- `chat` - Chat interface

## Intelligent Routing

The A2A framework automatically routes tasks to the most appropriate service based on:

1. **Agent Type**: Each agent has preferred services
2. **Task Type**: Each task type has optimal services
3. **Service Availability**: Healthy services are prioritized
4. **Load Balancing**: Distributes load across available services

### Routing Rules
- **Code Generation**: Blackbox.ai (primary)
- **Code Explanation**: Claude Pro (primary)
- **Architecture**: Gemini CLI (primary)
- **Debugging**: Claude Pro (primary)
- **General Queries**: Claude Pro (fallback)

## Monitoring

### Health Monitoring
All bridges are continuously monitored for:
- Service availability
- Response times
- Error rates
- Resource usage

### Session Management
- Session creation and tracking
- Multi-agent session coordination
- Session cleanup and persistence

### Performance Metrics
- Average response times
- Throughput statistics
- Error rate tracking
- Service utilization

## Security

### Browser Automation Security
- Headless browser execution
- No credential storage in code
- Secure session management
- Rate limiting protection

### API Security
- CORS configuration
- Input validation
- Error handling
- Request sanitization

## Development

### Adding New Bridges
1. Create new bridge file following the pattern
2. Update `start-a2a.js` configuration
3. Add service to `a2aService.ts`
4. Update routing logic
5. Add tests to `test-a2a.js`

### Bridge Template
```javascript
const express = require('express');
const cors = require('cors');

class NewBridge {
  constructor() {
    this.app = express();
    this.port = process.env.BRIDGE_PORT || 3006;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', service: 'new-bridge' });
    });
    
    this.app.post('/api/process', this.processRequest.bind(this));
  }

  async processRequest(req, res) {
    // Implementation
  }

  async start() {
    this.app.listen(this.port, () => {
      console.log(`New Bridge running on port ${this.port}`);
    });
  }
}

module.exports = NewBridge;
```

## Troubleshooting

### Common Issues

1. **Bridge Not Starting**
   - Check port availability
   - Verify dependencies installed
   - Review error logs

2. **Browser Automation Failing**
   - Ensure Puppeteer/Playwright installed
   - Check browser compatibility
   - Verify network connectivity

3. **Service Unavailable**
   - Check service health endpoints
   - Verify API credentials
   - Review network configuration

4. **Performance Issues**
   - Monitor response times
   - Check resource usage
   - Review rate limiting

### Debug Mode
```bash
DEBUG=a2a:* node start-a2a.js start
```

### Log Levels
- `info` - General information
- `warning` - Non-critical issues
- `error` - Critical errors
- `debug` - Detailed debugging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting guide
2. Review test results
3. Check service logs
4. Open an issue on GitHub

## Changelog

### v1.0.0
- Initial A2A framework implementation
- Blackbox.ai web automation bridge
- Claude Pro web automation bridge
- Gemini CLI automation bridge
- Master bridge orchestration
- A2A service layer integration
- Comprehensive testing framework
- Documentation and examples