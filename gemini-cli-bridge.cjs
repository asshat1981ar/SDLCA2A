/**
 * Gemini CLI Bridge
 * Port: 3005
 * 
 * Provides CLI automation for Gemini AI integration
 * Handles general queries, architecture discussions, and analysis via CLI commands
 */

const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class GeminiCLIBridge {
  constructor() {
    this.app = express();
    this.port = process.env.BRIDGE_PORT || 3005;
    
    // CLI management
    this.geminiCLI = null;
    this.isAvailable = false;
    this.apiKey = process.env.GEMINI_API_KEY;
    
    // Session management
    this.sessions = new Map();
    this.conversationHistory = new Map();
    
    // Command queue
    this.commandQueue = [];
    this.processing = false;
    this.lastCommandTime = 0;
    this.minCommandInterval = 1000; // 1 second between commands
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupGracefulShutdown();
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'healthy', 
        service: 'gemini-cli-bridge',
        isAvailable: this.isAvailable,
        hasApiKey: !!this.apiKey
      });
    });

    // Main processing endpoint
    this.app.post('/api/process', this.processRequest.bind(this));
    
    // Specific action endpoints
    this.app.post('/api/query', this.query.bind(this));
    this.app.post('/api/analyze', this.analyze.bind(this));
    this.app.post('/api/architecture', this.architecture.bind(this));
    this.app.post('/api/chat', this.chat.bind(this));
    
    // CLI management
    this.app.post('/api/setup', this.setup.bind(this));
    this.app.get('/api/status', this.getStatus.bind(this));
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('🛑 Shutting down Gemini CLI Bridge...');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  async checkGeminiCLI() {
    try {
      // Check if Gemini CLI is available
      const { stdout } = await execAsync('which gemini 2>/dev/null || echo "not found"');
      
      if (stdout.trim() === 'not found') {
        console.log('⚠️  Gemini CLI not found, checking for alternatives...');
        
        // Check for Google AI CLI
        const { stdout: gaiStdout } = await execAsync('which gai 2>/dev/null || echo "not found"');
        if (gaiStdout.trim() !== 'not found') {
          this.geminiCLI = 'gai';
          this.isAvailable = true;
          console.log('✅ Found Google AI CLI (gai)');
          return;
        }
        
        // Check for Node.js Google AI SDK
        const { stdout: nodeStdout } = await execAsync('which node 2>/dev/null || echo "not found"');
        if (nodeStdout.trim() !== 'not found') {
          this.geminiCLI = 'node';
          this.isAvailable = true;
          console.log('✅ Using Node.js with Google AI SDK');
          return;
        }
        
        this.isAvailable = false;
        console.log('❌ No Gemini CLI found');
      } else {
        this.geminiCLI = 'gemini';
        this.isAvailable = true;
        console.log('✅ Found Gemini CLI');
      }
      
    } catch (error) {
      console.error('❌ Error checking Gemini CLI:', error);
      this.isAvailable = false;
    }
  }

  async ensureGeminiReady() {
    if (!this.isAvailable) {
      await this.checkGeminiCLI();
    }
    
    if (!this.isAvailable) {
      throw new Error('Gemini CLI not available');
    }
  }

  async executeGeminiCommand(prompt, options = {}) {
    try {
      await this.ensureGeminiReady();
      
      // Rate limiting
      const now = Date.now();
      if (now - this.lastCommandTime < this.minCommandInterval) {
        await new Promise(resolve => setTimeout(resolve, this.minCommandInterval - (now - this.lastCommandTime)));
      }
      this.lastCommandTime = Date.now();
      
      let command;
      let args = [];
      
      switch (this.geminiCLI) {
        case 'gemini':
          command = 'gemini';
          args = ['--prompt', prompt];
          break;
        case 'gai':
          command = 'gai';
          args = ['--prompt', prompt];
          break;
        case 'node':
          // Use Node.js script with Google AI SDK
          command = 'node';
          args = [path.join(__dirname, 'gemini-node-client.js'), prompt];
          break;
        default:
          throw new Error('No suitable Gemini CLI found');
      }
      
      console.log(`🤖 Executing: ${command} ${args.join(' ')}`);
      
      return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, GEMINI_API_KEY: this.apiKey }
        });
        
        let output = '';
        let error = '';
        
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        process.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        process.on('close', (code) => {
          if (code === 0) {
            resolve(output.trim());
          } else {
            reject(new Error(`Command failed with code ${code}: ${error}`));
          }
        });
        
        process.on('error', (err) => {
          reject(err);
        });
      });
      
    } catch (error) {
      console.error('❌ Gemini command error:', error);
      throw error;
    }
  }

  async createGeminiNodeClient() {
    const clientPath = path.join(__dirname, 'gemini-node-client.js');
    
    if (!fs.existsSync(clientPath)) {
      const clientCode = `
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not set');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = process.argv[2];
  if (!prompt) {
    console.error('No prompt provided');
    process.exit(1);
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    console.log(text);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
      `;
      
      fs.writeFileSync(clientPath, clientCode);
      console.log('✅ Created Gemini Node.js client');
    }
  }

  async processRequest(req, res) {
    try {
      const { agent, task, context, sessionId } = req.body;
      
      console.log(`📝 Processing request for agent: ${agent}, task: ${task?.type}`);
      
      // Ensure Gemini is ready
      await this.ensureGeminiReady();
      
      // Route to appropriate handler
      let result;
      switch (task?.type) {
        case 'general_query':
          result = await this.queryInternal(task.prompt, context);
          break;
        case 'architecture':
          result = await this.architectureInternal(task.prompt, context);
          break;
        case 'analysis':
          result = await this.analyzeInternal(task.prompt, context);
          break;
        case 'chat':
          result = await this.chatInternal(task.message, context);
          break;
        default:
          result = await this.queryInternal(task?.prompt || task?.message || 'Hello', context);
      }
      
      res.json({
        success: true,
        result,
        agent,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Process request error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async queryInternal(prompt, context = {}) {
    try {
      const response = await this.executeGeminiCommand(prompt);
      
      return {
        response,
        prompt,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Query error:', error);
      
      // Return mock response for development
      return {
        response: `Mock Gemini response for: "${prompt}"\n\nThis is a comprehensive response that addresses your query. I understand you're looking for information about ${prompt}. Here's my analysis and recommendations based on the context provided.`,
        prompt,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async analyzeInternal(prompt, context) {
    try {
      const analysisPrompt = `Please provide a detailed analysis of the following:\n\n${prompt}\n\nInclude:\n1. Key insights\n2. Potential implications\n3. Recommendations\n4. Next steps`;
      
      const response = await this.executeGeminiCommand(analysisPrompt);
      
      return {
        analysis: response,
        prompt,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        analysis: `Mock analysis for: "${prompt}"\n\n**Key Insights:**\n- Important patterns identified\n- Relevant considerations noted\n\n**Implications:**\n- Potential impact on project\n- Strategic considerations\n\n**Recommendations:**\n- Suggested approach\n- Best practices to follow\n\n**Next Steps:**\n- Action items to implement\n- Timeline considerations`,
        prompt,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async architectureInternal(prompt, context) {
    try {
      const architecturePrompt = `As a senior architect, please provide architectural guidance for:\n\n${prompt}\n\nInclude:\n1. System design recommendations\n2. Technology stack suggestions\n3. Scalability considerations\n4. Security implications\n5. Performance optimizations`;
      
      const response = await this.executeGeminiCommand(architecturePrompt);
      
      return {
        architecture: response,
        prompt,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        architecture: `Mock architectural guidance for: "${prompt}"\n\n**System Design:**\n- Microservices architecture recommended\n- API-first approach\n- Event-driven communication\n\n**Technology Stack:**\n- Modern frameworks and libraries\n- Cloud-native solutions\n- Containerization strategy\n\n**Scalability:**\n- Horizontal scaling approach\n- Load balancing considerations\n- Database sharding strategies\n\n**Security:**\n- Authentication and authorization\n- Data encryption\n- Security best practices\n\n**Performance:**\n- Caching strategies\n- Database optimization\n- CDN implementation`,
        prompt,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async chatInternal(message, context) {
    try {
      const response = await this.executeGeminiCommand(message);
      
      return {
        response,
        message,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        response: `Mock Gemini chat response: I understand your message "${message}". Based on the context, here's my thoughtful response addressing your points and providing relevant insights.`,
        message,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async query(req, res) {
    try {
      const { prompt, context } = req.body;
      const result = await this.queryInternal(prompt, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async analyze(req, res) {
    try {
      const { prompt, context } = req.body;
      const result = await this.analyzeInternal(prompt, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async architecture(req, res) {
    try {
      const { prompt, context } = req.body;
      const result = await this.architectureInternal(prompt, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async chat(req, res) {
    try {
      const { message, context } = req.body;
      const result = await this.chatInternal(message, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async setup(req, res) {
    try {
      await this.checkGeminiCLI();
      
      if (this.geminiCLI === 'node') {
        await this.createGeminiNodeClient();
      }
      
      res.json({ 
        success: true, 
        isAvailable: this.isAvailable,
        cli: this.geminiCLI,
        hasApiKey: !!this.apiKey
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStatus(req, res) {
    res.json({
      service: 'gemini-cli-bridge',
      port: this.port,
      isAvailable: this.isAvailable,
      cli: this.geminiCLI,
      hasApiKey: !!this.apiKey
    });
  }

  async start() {
    try {
      // Initialize Gemini CLI
      await this.checkGeminiCLI();
      
      if (this.geminiCLI === 'node') {
        await this.createGeminiNodeClient();
      }
      
      this.app.listen(this.port, () => {
        console.log(`🔷 Gemini CLI Bridge running on port ${this.port}`);
        console.log(`🌐 Health: http://localhost:${this.port}/health`);
        console.log(`🤖 CLI: ${this.geminiCLI || 'not available'}`);
      });
    } catch (error) {
      console.error('❌ Failed to start Gemini CLI Bridge:', error);
      process.exit(1);
    }
  }
}

// Start the bridge if run directly
if (require.main === module) {
  const bridge = new GeminiCLIBridge();
  bridge.start();
}

module.exports = GeminiCLIBridge;