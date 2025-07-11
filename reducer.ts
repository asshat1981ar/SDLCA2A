

import { AppPlan, ChatMessage, IdeationResult, ProjectFile, ProjectPhase, Agent, TerminalEntry, ProjectState, GitHubSettings, ApiSettings } from './types.ts';
import { updateFileByPath as updateFileTree, addFileByPath as addFileToFileTree, flattenFileTree, findFileByPath } from './utils/fileTree.ts';
import { generateUUID } from './utils/uuid.ts';

export type Action =
    | { type: 'RESET_STATE' }
    | { type: 'SET_STATE_FROM_LOAD'; payload: ProjectState }
    | { type: 'START_IDEATION'; payload: { prompt: string } }
    | { type: 'SET_IDEATION_RESULT'; payload: IdeationResult }
    | { type: 'START_PLANNING'; payload: { prompt: string } }
    | { type: 'SET_PLAN'; payload: AppPlan }
    | { type: 'UPDATE_FILE_CODE'; payload: { path: string; code: string } }
    | { type: 'SET_FILE_STATUS'; payload: { path: string; status: ProjectFile['status'] } }
    | { type: 'UPDATE_FILE_TEST_STATUS'; payload: { path: string; testStatus: ProjectFile['testStatus']; testError?: string; } }
    | { type: 'ADD_FILE'; payload: { path: string } }
    | { type: 'SELECT_FILE'; payload: string | null }
    | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
    | { type: 'SET_LOADING'; payload: { isLoading: boolean; message?: string } }
    | { type: 'SET_ERROR'; payload: string | null }
    | { type: 'ADD_TERMINAL_ENTRY'; payload: TerminalEntry }
    | { type: 'CLEAR_TERMINAL' }
    | { type: 'SET_BUILD_STATUS', payload: boolean }
    | { type: 'UPDATE_AGENT_STATUS', payload: { name: Agent['name'], status: Agent['status'] }}
    | { type: 'SET_GITHUB_SETTINGS', payload: GitHubSettings }
    | { type: 'SET_API_SETTINGS', payload: ApiSettings };


const initialAgents: Agent[] = [
    { name: 'Orchestrator', status: 'Idle', role: 'Coordinates the team and communicates with the user.' },
    { name: 'Market Analyst', status: 'Idle', role: 'Researches competitors and market trends.' },
    { name: 'Product Strategist', status: 'Idle', role: 'Suggests features and defines product direction.' },
    { name: 'Frontend Expert', status: 'Idle', role: 'Specializes in UI/UX, and frontend frameworks.' },
    { name: 'Backend Expert', status: 'Idle', role: 'Handles server-side logic, APIs, and data.' },
    { name: 'DB Architect', status: 'Idle', role: 'Designs and manages the database schema.' },
    { name: 'QA Engineer', status: 'Idle', role: 'Ensures code quality and tests the application.' },
    { name: 'Debugger', status: 'Idle', role: 'Finds and fixes bugs in the code.' },
    { name: 'Senior Architect', status: 'Idle', role: 'Analyzes the codebase for high-level improvements.' },
    { name: 'DevOps Engineer', status: 'Idle', role: 'Manages CI/CD, deployment, and infrastructure.' },
    { name: 'Security Analyst', status: 'Idle', role: 'Audits code for security vulnerabilities.' },
    { name: 'Claude Code', status: 'Idle', role: 'Expert developer with comprehensive project analysis and coding capabilities.' },
];

export const initialState: ProjectState = {
    projectPhase: 'IDEA_INPUT',
    projectPlan: null,
    ideationResult: null,
    originalPrompt: '',
    chatHistory: [],
    isLoading: false,
    loadingMessage: '',
    error: null,
    selectedFilePath: null,
    livePreviewHtml: null,
    terminalOutput: [],
    isBuilding: false,
    agents: initialAgents,
    githubSettings: { token: '', repoName: '', githubRepoUrl: '' },
    apiSettings: { provider: 'deepseek', model: 'deepseek-coder', gemini: '', openAI: '', anthropic: '', claudeCode: '' },
};

export function reducer(state: ProjectState, action: Action): ProjectState {
    switch (action.type) {
        case 'RESET_STATE':
            localStorage.removeItem('autonomous-sdlc-project');
            localStorage.removeItem('knowledge-base');
            return {...initialState, agents: initialAgents.map(a => ({...a, status: 'Idle'}))};
        
        case 'SET_STATE_FROM_LOAD':
            return { ...action.payload };

        case 'START_IDEATION':
            return {
                ...initialState,
                agents: initialAgents.map(a => ({...a, status: 'Idle'})),
                projectPhase: 'IDEATION',
                originalPrompt: action.payload.prompt,
                chatHistory: [{ id: generateUUID(), role: 'system', content: `New idea received: "${action.payload.prompt}". Kicking off ideation phase.`, timestamp: new Date().toISOString() }],
            };

        case 'SET_IDEATION_RESULT':
             return {
                ...state,
                ideationResult: action.payload,
                chatHistory: [...state.chatHistory, { id: crypto.randomUUID(), role: 'system', content: `Ideation complete. Presenting analysis to user for feedback.`, timestamp: new Date().toISOString() }],
             };
        
        case 'START_PLANNING':
             return {
                 ...state,
                 projectPhase: 'PLANNING',
                 isLoading: true,
                 loadingMessage: 'AI is planning your project...',
                 chatHistory: [
                     ...state.chatHistory,
                     { id: crypto.randomUUID(), role: 'user', content: `Okay, let's proceed with this refined idea: "${action.payload.prompt}"`, timestamp: new Date().toISOString() },
                     { id: crypto.randomUUID(), role: 'assistant', content: `Great! I'm starting to plan out your application. I'll come up with a tech stack and file structure.`, timestamp: new Date().toISOString() },
                 ],
             };

        case 'SET_PLAN':
            const allFiles = flattenFileTree(action.payload.fileStructure);
            allFiles.forEach(file => {
                 file.status = 'planned';
                 file.testStatus = 'untested';
            });
            return {
                ...state,
                projectPlan: action.payload,
                projectPhase: 'CODING',
                chatHistory: [...state.chatHistory, { id: crypto.randomUUID(), role: 'assistant', content: `I've finished planning! Here is the proposed tech stack and file structure. You can click on a file to generate its code, or click "Build Full Project" to have me generate everything.`, timestamp: new Date().toISOString() }],
            };
        
        case 'UPDATE_FILE_CODE':
            if (!state.projectPlan) return state;
            const updatedProjectPlan = updateFileTree(state.projectPlan, action.payload.path, { code: action.payload.code, status: 'modified', testStatus: 'untested' });
            
            // Also update the live preview if the changed file is the one being previewed
            const newLivePreviewHtml = state.selectedFilePath === action.payload.path && action.payload.path.endsWith('index.html') ? action.payload.code : state.livePreviewHtml;

            return {
                ...state,
                projectPlan: updatedProjectPlan,
                livePreviewHtml: newLivePreviewHtml,
            };

        case 'SET_FILE_STATUS':
             if (!state.projectPlan) return state;
             return {
                ...state,
                projectPlan: updateFileTree(state.projectPlan, action.payload.path, { status: action.payload.status })
             };
        
        case 'UPDATE_FILE_TEST_STATUS':
             if (!state.projectPlan) return state;
             const { path, testStatus, testError } = action.payload;
             return {
                ...state,
                projectPlan: updateFileTree(state.projectPlan, path, { testStatus, testError })
             };

        case 'ADD_FILE':
            if (!state.projectPlan) return state;
            return {
                ...state,
                projectPlan: addFileToFileTree(state.projectPlan, action.payload.path)
            };

        case 'SELECT_FILE':
            const selectedFile = action.payload && state.projectPlan ? findFileByPath(state.projectPlan.fileStructure, action.payload) : null;
            const previewHtml = selectedFile?.path.endsWith('index.html') ? selectedFile.code || '<html><body>No content yet. Generate this file to see a preview.</body></html>' : state.livePreviewHtml;
            return { ...state, selectedFilePath: action.payload, livePreviewHtml: previewHtml };
        
        case 'ADD_CHAT_MESSAGE':
            return { ...state, chatHistory: [...state.chatHistory, action.payload] };

        case 'SET_LOADING':
            return { ...state, isLoading: action.payload.isLoading, loadingMessage: action.payload.message ?? '' };

        case 'SET_ERROR':
            return { ...state, error: action.payload, isLoading: false };

        case 'ADD_TERMINAL_ENTRY':
            return { ...state, terminalOutput: [...state.terminalOutput.slice(-100), action.payload] };

        case 'CLEAR_TERMINAL':
            return { ...state, terminalOutput: [] };
        
        case 'SET_BUILD_STATUS':
            return { ...state, isBuilding: action.payload, isLoading: action.payload };

        case 'UPDATE_AGENT_STATUS':
            return {
                ...state,
                agents: state.agents.map(a => a.name === action.payload.name ? { ...a, status: action.payload.status } : a)
            };
        
        case 'SET_GITHUB_SETTINGS':
            return { ...state, githubSettings: action.payload };
        
        case 'SET_API_SETTINGS':
            return { ...state, apiSettings: action.payload };

        default:
            return state;
    }
}