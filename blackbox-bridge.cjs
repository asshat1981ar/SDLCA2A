/**
 * Blackbox.ai Web Automation Bridge
 * Port: 3003
 * 
 * Provides web automation for Blackbox.ai Pro Plan integration
 * Handles code generation, chat, and other AI capabilities via browser automation
 */

const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');

class BlackboxBridge {
  constructor() {
    this.app = express();
    this.port = process.env.BRIDGE_PORT || 3003;
    
    // Browser management
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.loginAttempts = 0;
    this.maxLoginAttempts = 3;
    
    // Session management
    this.sessions = new Map();
    this.conversationHistory = new Map();
    
    // Rate limiting
    this.requestQueue = [];
    this.processing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 2000; // 2 seconds between requests
    
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
        service: 'blackbox-bridge',
        isLoggedIn: this.isLoggedIn,
        browserActive: !!this.browser
      });
    });

    // Main processing endpoint
    this.app.post('/api/process', this.processRequest.bind(this));
    
    // Specific action endpoints
    this.app.post('/api/generate-code', this.generateCode.bind(this));
    this.app.post('/api/chat', this.chat.bind(this));
    this.app.post('/api/explain-code', this.explainCode.bind(this));
    this.app.post('/api/review-code', this.reviewCode.bind(this));
    
    // Session management
    this.app.post('/api/login', this.login.bind(this));
    this.app.post('/api/logout', this.logout.bind(this));
    this.app.get('/api/status', this.getStatus.bind(this));
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      console.log('🛑 Shutting down Blackbox Bridge...');
      if (this.browser) {
        await this.browser.close();
      }
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  async initializeBrowser() {
    if (this.browser) {
      return;
    }

    try {
      console.log('🌐 Launching browser for Blackbox.ai...');
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      throw error;
    }
  }

  async ensureBrowserReady() {
    if (!this.browser || !this.page) {
      await this.initializeBrowser();
    }
    
    if (!this.isLoggedIn) {
      await this.autoLogin();
    }
  }

  async autoLogin() {
    try {
      console.log('🔐 Attempting to login to Blackbox.ai...');
      
      if (this.loginAttempts >= this.maxLoginAttempts) {
        throw new Error('Max login attempts exceeded');
      }
      
      this.loginAttempts++;
      
      // Navigate to Blackbox.ai
      await this.page.goto('https://www.blackbox.ai/', { waitUntil: 'networkidle2' });
      
      // Check if already logged in
      const isLoggedIn = await this.page.evaluate(() => {
        return document.querySelector('[data-testid="user-menu"]') !== null ||
               document.querySelector('.user-avatar') !== null ||
               !document.querySelector('[data-testid="login-button"]');
      });
      
      if (isLoggedIn) {
        console.log('✅ Already logged in to Blackbox.ai');
        this.isLoggedIn = true;
        return;
      }
      
      // Look for login button
      const loginButton = await this.page.$('[data-testid="login-button"]') || 
                         await this.page.$('button:contains("Login")') ||
                         await this.page.$('a[href*="login"]');
      
      if (loginButton) {
        await loginButton.click();
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
      }
      
      // For now, we'll simulate being logged in for development
      // In production, you would implement actual login logic here
      console.log('⚠️  Login simulation for development mode');
      this.isLoggedIn = true;
      
    } catch (error) {
      console.error('❌ Login failed:', error);
      this.isLoggedIn = false;
      throw error;
    }
  }

  async processRequest(req, res) {
    try {
      const { agent, task, context, sessionId } = req.body;
      
      console.log(`📝 Processing request for agent: ${agent}, task: ${task?.type}`);
      
      // Ensure browser is ready
      await this.ensureBrowserReady();
      
      // Route to appropriate handler
      let result;
      switch (task?.type) {
        case 'code_generation':
          result = await this.generateCodeInternal(task.prompt, task.language, context);
          break;
        case 'code_explanation':
          result = await this.explainCodeInternal(task.code, task.language, context);
          break;
        case 'code_review':
          result = await this.reviewCodeInternal(task.code, task.language, context);
          break;
        case 'chat':
          result = await this.chatInternal(task.message, context);
          break;
        default:
          result = await this.generateCodeInternal(task?.prompt || 'Hello', 'javascript', context);
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

  async generateCodeInternal(prompt, language = 'javascript', context = {}) {
    try {
      await this.ensureBrowserReady();
      
      // Navigate to chat interface
      await this.page.goto('https://www.blackbox.ai/chat', { waitUntil: 'networkidle2' });
      
      // Find chat input
      const chatInput = await this.page.$('textarea[placeholder*="Ask"]') ||
                       await this.page.$('input[placeholder*="Ask"]') ||
                       await this.page.$('textarea') ||
                       await this.page.$('.chat-input');
      
      if (!chatInput) {
        throw new Error('Chat input not found');
      }
      
      // Construct prompt for code generation
      const fullPrompt = `Generate ${language} code for the following requirement: ${prompt}`;
      
      // Clear and type prompt
      await chatInput.click();
      await chatInput.evaluate(el => el.value = '');
      await chatInput.type(fullPrompt);
      
      // Submit
      const submitButton = await this.page.$('button[type="submit"]') ||
                          await this.page.$('button:contains("Send")') ||
                          await this.page.$('.send-button');
      
      if (submitButton) {
        await submitButton.click();
      } else {
        await chatInput.press('Enter');
      }
      
      // Wait for response
      await this.page.waitForTimeout(3000);
      
      // Extract response
      const response = await this.page.evaluate(() => {
        const messages = document.querySelectorAll('.message, .chat-message, .response');
        const lastMessage = messages[messages.length - 1];
        return lastMessage ? lastMessage.textContent : 'No response received';
      });
      
      return {
        generatedCode: response,
        language,
        prompt,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Code generation error:', error);
      
      // Return mock response for development
      return {
        generatedCode: `// Mock ${language} code for: ${prompt}\nfunction mockFunction() {\n  console.log('Generated by Blackbox.ai Bridge');\n  return 'mock-result';\n}`,
        language,
        prompt,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async explainCodeInternal(code, language, context) {
    try {
      await this.ensureBrowserReady();
      
      const prompt = `Explain this ${language} code:\n\n${code}`;
      const result = await this.generateCodeInternal(prompt, language, context);
      
      return {
        explanation: result.generatedCode,
        code,
        language,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        explanation: `Mock explanation for ${language} code:\n\nThis code appears to be a ${language} implementation that performs basic operations.`,
        code,
        language,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async reviewCodeInternal(code, language, context) {
    try {
      await this.ensureBrowserReady();
      
      const prompt = `Review this ${language} code for best practices, bugs, and improvements:\n\n${code}`;
      const result = await this.generateCodeInternal(prompt, language, context);
      
      return {
        review: result.generatedCode,
        code,
        language,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        review: `Mock code review for ${language}:\n\n1. Code structure looks good\n2. Consider adding error handling\n3. Add comments for clarity`,
        code,
        language,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async chatInternal(message, context) {
    try {
      await this.ensureBrowserReady();
      
      const result = await this.generateCodeInternal(message, 'general', context);
      
      return {
        response: result.generatedCode,
        message,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        response: `Mock chat response: I understand you're asking about "${message}". Here's a helpful response from the Blackbox.ai bridge.`,
        message,
        timestamp: new Date().toISOString(),
        mock: true
      };
    }
  }

  async generateCode(req, res) {
    try {
      const { prompt, language, context } = req.body;
      const result = await this.generateCodeInternal(prompt, language, context);
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

  async explainCode(req, res) {
    try {
      const { code, language, context } = req.body;
      const result = await this.explainCodeInternal(code, language, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async reviewCode(req, res) {
    try {
      const { code, language, context } = req.body;
      const result = await this.reviewCodeInternal(code, language, context);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async login(req, res) {
    try {
      await this.autoLogin();
      res.json({ success: true, isLoggedIn: this.isLoggedIn });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async logout(req, res) {
    try {
      this.isLoggedIn = false;
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getStatus(req, res) {
    res.json({
      service: 'blackbox-bridge',
      port: this.port,
      isLoggedIn: this.isLoggedIn,
      browserActive: !!this.browser,
      loginAttempts: this.loginAttempts,
      maxLoginAttempts: this.maxLoginAttempts
    });
  }

  async start() {
    try {
      this.app.listen(this.port, () => {
        console.log(`🟦 Blackbox.ai Bridge running on port ${this.port}`);
        console.log(`🌐 Health: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      console.error('❌ Failed to start Blackbox Bridge:', error);
      process.exit(1);
    }
  }
}

// Start the bridge if run directly
if (require.main === module) {
  const bridge = new BlackboxBridge();
  bridge.start();
}

module.exports = BlackboxBridge;