

export type ProjectPhase = 'IDEA_INPUT' | 'IDEATION' | 'PLANNING' | 'CODING';

export type AgentName = 'Orchestrator' | 'Market Analyst' | 'Product Strategist' | 'Frontend Expert' | 'Backend Expert' | 'DB Architect' | 'QA Engineer' | 'Debugger' | 'Senior Architect' | 'DevOps Engineer' | 'Security Analyst' | 'Software Architect' | 'Full-Stack Developer' | 'UI/UX Expert' | 'Claude Code' | 'A2A Agent Director' | 'Blackbox AI Agent' | 'Claude Pro Agent' | 'Gemini CLI Agent';

export interface AppIdea {
  prompt: string;
  githubRepoUrl?: string;
}

export interface Competitor {
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
}

export interface IdeationResult {
    competitors: Competitor[];
    differentiators: string[];
    featureSuggestions: string[];
}

export interface AppPlan {
  projectName: string;
  description: string;
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    deployment: string[];
  };
  fileStructure: ProjectFile[];
}

export interface ProjectFile {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: ProjectFile[];
  code?: string;
  status: 'planned' | 'generating' | 'generated' | 'modified' | 'error';
  testStatus: 'untested' | 'passing' | 'failing';
  testError?: string; 
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

export interface Agent {
    name: AgentName;
    status: 'Idle' | 'Thinking...' | 'Researching...'| 'Planning' | 'Coding' | 'Testing' | 'Debugging' | 'Refactoring' | 'Deploying' | 'Auditing' | 'Ingesting';
    role: string;
}

export interface GitHubSettings {
    token: string;
    repoName: string;
    githubRepoUrl?: string;
}

export type ApiProviderType = 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'claude-code';

export type ModelType = 'gemini-flash' | 'gpt-4' | 'claude-3' | 'deepseek-coder' | 'deepseek-r1' | 'claude-code-cli';

export interface ApiSettings {
    provider: ApiProviderType;
    model: ModelType;
    gemini: string;
    openAI: string;
    anthropic: string;
    claudeCode: string;
}

export interface RefactorPlan {
    reasoning: string;
    newFile?: {
        path: string;
        code: string;
    };
    filesToUpdate: {
        path:string;
        newCode: string;
    }[];
}

export interface TerminalEntry {
    agent: AgentName | 'USER' | 'SYSTEM';
    message: string;
    status: 'info' | 'success' | 'error' | 'warning';
}

export interface AgentTask {
    type: 'code_generation' | 'code_explanation' | 'code_review' | 'debugging' | 'refactoring' | 'testing' | 'deployment' | 'architecture' | 'security' | 'database' | 'ui_design' | 'performance' | 'general_query' | 'analysis' | 'chat';
    prompt?: string;
    message?: string;
    code?: string;
    language?: string;
    error?: string;
    context?: Record<string, any>;
}

export interface A2ASession {
    id: string;
    task: AgentTask;
    agents: AgentName[];
    context?: Record<string, any>;
    status: 'created' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    results?: Array<{
        agent: AgentName;
        service: string;
        result?: any;
        error?: string;
        timestamp: Date;
    }>;
}

export interface ProjectState {
    projectPhase: ProjectPhase;
    projectPlan: AppPlan | null;
    ideationResult: IdeationResult | null;
    originalPrompt: string;
    chatHistory: ChatMessage[];
    isLoading: boolean;
    loadingMessage: string;
    error: string | null;
    selectedFilePath: string | null;
    livePreviewHtml: string | null;
    terminalOutput: TerminalEntry[];
    isBuilding: boolean;
    agents: Agent[];
    githubSettings: GitHubSettings;
    apiSettings: ApiSettings;
    a2aSession?: A2ASession;
}