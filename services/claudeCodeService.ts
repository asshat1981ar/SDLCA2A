import { AppPlan, ChatMessage, ProjectFile } from '../types.ts';

interface ClaudeCodeRequest {
  action: 'analyze' | 'generate' | 'refactor' | 'debug' | 'chat';
  context?: {
    plan?: AppPlan;
    files?: ProjectFile[];
    currentFile?: ProjectFile;
    prompt?: string;
    chatHistory?: ChatMessage[];
  };
}

interface ClaudeCodeResponse {
  success: boolean;
  data?: any;
  error?: string;
}

class ClaudeCodeService {
  private baseUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.baseUrl = process.env.CLAUDE_CODE_URL || 'http://localhost:3002'; // Updated to enhanced DeepSeek bridge
  }

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      this.isConnected = response.ok;
      return this.isConnected;
    } catch (error) {
      console.warn('Claude Code service not available:', error);
      this.isConnected = false;
      return false;
    }
  }

  async sendRequest(request: ClaudeCodeRequest): Promise<ClaudeCodeResponse> {
    if (!this.isConnected) {
      await this.connect();
    }

    if (!this.isConnected) {
      return {
        success: false,
        error: 'Claude Code service is not available'
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/claude-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Claude Code request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async analyzeCodebase(plan: AppPlan, files: ProjectFile[]): Promise<string | null> {
    const response = await this.sendRequest({
      action: 'analyze',
      context: { plan, files }
    });

    return response.success ? response.data?.analysis : null;
  }

  async generateCodeForFile(file: ProjectFile, plan: AppPlan, allFiles: ProjectFile[]): Promise<{ code: string; planModificationRequest?: any } | null> {
    const response = await this.sendRequest({
      action: 'generate',
      context: { plan, files: allFiles, currentFile: file }
    });

    return response.success ? response.data : null;
  }

  async refactorCode(files: ProjectFile[]): Promise<any> {
    const response = await this.sendRequest({
      action: 'refactor',
      context: { files }
    });

    return response.success ? response.data : null;
  }

  async debugCode(failingFile: ProjectFile, errorMessage: string): Promise<string | null> {
    const response = await this.sendRequest({
      action: 'debug',
      context: { 
        currentFile: failingFile,
        prompt: `Debug this code. Error: ${errorMessage}`
      }
    });

    return response.success ? response.data?.fixedCode : null;
  }

  async chat(message: string, chatHistory: ChatMessage[], plan?: AppPlan, currentFile?: ProjectFile): Promise<string | null> {
    const response = await this.sendRequest({
      action: 'chat',
      context: { 
        prompt: message,
        chatHistory,
        plan,
        currentFile
      }
    });

    return response.success ? response.data?.response : null;
  }

  isAvailable(): boolean {
    return this.isConnected;
  }
}

export const claudeCodeService = new ClaudeCodeService();

export const isClaudeCodeConfigured = async (): Promise<boolean> => {
  return await claudeCodeService.connect();
};