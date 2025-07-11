// Claude Code Bridge Server - Test Version
// This creates a simple HTTP server that simulates the Claude Code bridge functionality

const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3002;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'claude-code-bridge-test' });
});

// Check if claude-code CLI is available
function checkClaudeCodeCLI() {
  return new Promise((resolve) => {
    const checkProcess = spawn('which', ['claude-code']);
    checkProcess.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

// Main Claude Code API endpoint
app.post('/api/claude-code', async (req, res) => {
  const { action, context } = req.body;
  
  try {
    console.log(`Received ${action} request with context:`, JSON.stringify(context, null, 2));
    
    // Check if claude-code CLI is available
    const claudeCodeAvailable = await checkClaudeCodeCLI();
    
    if (!claudeCodeAvailable) {
      console.log('Claude Code CLI not available, returning mock response');
      
      // Return mock responses for testing
      let mockResult;
      
      switch (action) {
        case 'analyze':
          mockResult = { 
            analysis: `Mock analysis for project: ${context.plan?.projectName || 'Unknown'}\n\nThis is a test response from the Claude Code bridge. The actual Claude Code CLI is not available in this environment.` 
          };
          break;
          
        case 'generate':
          mockResult = { 
            code: `// Mock generated code for ${context.currentFile?.path || 'unknown file'}\n// This is a test response\nconsole.log('Hello from Claude Code bridge test');`, 
            planModificationRequest: null 
          };
          break;
          
        case 'refactor':
          mockResult = { 
            reasoning: "Mock refactoring analysis: Found potential improvements in code structure and performance.", 
            filesToUpdate: [] 
          };
          break;
          
        case 'debug':
          mockResult = { 
            fixedCode: `// Mock fixed code\n// Original issue has been resolved\n${context.currentFile?.code || '// No code provided'}` 
          };
          break;
          
        case 'chat':
          mockResult = { 
            response: `Mock response to: "${context.prompt}"\n\nThis is a test response from the Claude Code bridge. The bridge is working correctly, but the actual Claude Code CLI would need to be installed and configured for full functionality.` 
          };
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      res.json({
        ...mockResult,
        _mock: true,
        _message: "This is a mock response. Install and configure Claude Code CLI for actual functionality."
      });
      return;
    }
    
    // If claude-code CLI is available, proceed with actual execution
    let prompt = '';
    
    switch (action) {
      case 'analyze':
        prompt = `Analyze this codebase and provide insights:\n\nProject: ${context.plan?.projectName}\nDescription: ${context.plan?.description}\n\nFiles: ${context.files?.length || 0} total files`;
        break;
        
      case 'generate':
        prompt = `Generate code for file: ${context.currentFile?.path}\n\nProject: ${context.plan?.projectName}\nTech Stack: ${JSON.stringify(context.plan?.techStack)}\n\nContext: This is part of a ${context.plan?.description}`;
        break;
        
      case 'refactor':
        prompt = `Analyze and suggest refactoring for this codebase with ${context.files?.length || 0} files. Look for code duplication, poor patterns, and improvement opportunities.`;
        break;
        
      case 'debug':
        prompt = `Debug this code: ${context.currentFile?.code}\n\nError: ${context.prompt}`;
        break;
        
      case 'chat':
        prompt = context.prompt || 'Hello';
        if (context.plan) {
          prompt += `\n\nProject context: ${context.plan.projectName} - ${context.plan.description}`;
        }
        if (context.currentFile) {
          prompt += `\n\nCurrent file: ${context.currentFile.path}`;
        }
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log('Executing claude-code with prompt:', prompt);
    
    // Execute Claude Code CLI with timeout
    const claudeProcess = spawn('claude-code', ['--prompt', prompt], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let error = '';
    
    // Set a timeout for the process
    const timeout = setTimeout(() => {
      claudeProcess.kill();
      res.status(500).json({ error: 'Claude Code execution timed out' });
    }, 30000); // 30 second timeout
    
    claudeProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    claudeProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    claudeProcess.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        // Parse output based on action type
        let result;
        
        switch (action) {
          case 'analyze':
            result = { analysis: output.trim() };
            break;
          case 'generate':
            result = { code: output.trim(), planModificationRequest: null };
            break;
          case 'refactor':
            try {
              result = JSON.parse(output.trim());
            } catch {
              result = { reasoning: output.trim(), filesToUpdate: [] };
            }
            break;
          case 'debug':
            result = { fixedCode: output.trim() };
            break;
          case 'chat':
            result = { response: output.trim() };
            break;
        }
        
        res.json(result);
      } else {
        console.error('Claude Code execution failed:', error);
        res.status(500).json({ error: error || 'Claude Code execution failed' });
      }
    });
    
    claudeProcess.on('error', (err) => {
      clearTimeout(timeout);
      console.error('Failed to spawn claude-code process:', err);
      res.status(500).json({ error: 'Failed to execute Claude Code CLI' });
    });
    
  } catch (err) {
    console.error('Claude Code bridge error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Claude Code Bridge Test Server running on port ${PORT}`);
  console.log('This server bridges the SDLC app with Claude Code CLI');
  console.log('If Claude Code CLI is not available, mock responses will be returned');
});

module.exports = app;