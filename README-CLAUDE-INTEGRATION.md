# Claude Code Integration Setup

This SDLC app has been modified to integrate with Claude Code CLI for enhanced development capabilities.

## Features Added

- **Claude Code Agent**: New AI agent that uses Claude Code CLI for superior code generation and analysis
- **Hybrid AI System**: Falls back to Gemini when Claude Code is unavailable
- **Real-time Integration**: Chat and code generation requests are routed through Claude Code first

## Setup Instructions

### 1. Install Claude Code CLI
```bash
# Install Claude Code CLI (follow official installation instructions)
npm install -g @anthropic/claude-code
```

### 2. Start the Bridge Server
```bash
# Install bridge dependencies
cd /path/to/sdlc
npm install --prefix . express cors nodemon

# Start the bridge server
node claude-code-bridge.js
# OR for development
npx nodemon claude-code-bridge.js
```

### 3. Configure Environment Variables
```bash
# Add to your .env.local file
CLAUDE_CODE_URL=http://localhost:3001
```

### 4. Run the SDLC App
```bash
npm run dev
```

## How It Works

1. **Agent Selection**: When generating code or chatting, the system first tries to connect to Claude Code
2. **Bridge Communication**: The app communicates with Claude Code through a bridge server on port 3001
3. **Fallback System**: If Claude Code is unavailable, the system falls back to Gemini AI
4. **Enhanced Capabilities**: Claude Code provides superior code analysis, generation, and debugging

## API Integration

The integration works through these key components:

- `services/claudeCodeService.ts` - Service layer for Claude Code communication
- `claude-code-bridge.js` - Bridge server that translates SDLC requests to Claude Code CLI
- Updated orchestrator hooks to prioritize Claude Code

## Commands Available

When Claude Code is active, you can:

- Generate superior code for any file in your project
- Get comprehensive codebase analysis
- Receive advanced refactoring suggestions
- Debug code with detailed explanations
- Chat with enhanced project context understanding

## Troubleshooting

- Ensure Claude Code CLI is properly installed and accessible
- Check that the bridge server is running on port 3001
- Verify CLAUDE_CODE_URL environment variable is set
- Check browser console for connection errors

The app will automatically fallback to Gemini if Claude Code is unavailable.