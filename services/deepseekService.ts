import { AppIdea, AppPlan, ChatMessage, ProjectFile, IdeationResult } from '../types.ts';

// DeepSeek AI Service for collaborative coding
class DeepSeekService {
    private apiKey: string;
    private baseUrl: string = 'https://api.deepseek.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async makeRequest(endpoint: string, data: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    async chat(messages: Array<{role: string, content: string}>, model: string = 'deepseek-coder'): Promise<string> {
        try {
            const response = await this.makeRequest('/chat/completions', {
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4000,
                stream: false
            });

            return response.choices[0]?.message?.content || 'No response from DeepSeek';
        } catch (error) {
            console.error('DeepSeek chat error:', error);
            throw error;
        }
    }

    async performIdeation(idea: AppIdea): Promise<IdeationResult> {
        const messages = [
            {
                role: 'system',
                content: `You are a Product Strategist and Market Research Analyst. Analyze the user's application idea and provide competitor analysis and feature suggestions. Respond in JSON format with the structure:
{
  "competitors": [{"name": "", "description": "", "strengths": [], "weaknesses": []}],
  "differentiators": [""],
  "featureSuggestions": [""]
}`
            },
            {
                role: 'user',
                content: `Analyze this app idea and provide competitive landscape and feature suggestions: "${idea.prompt}"`
            }
        ];

        try {
            const response = await this.chat(messages, 'deepseek-r1');
            const parsed = this.parseJsonResponse<IdeationResult>(response);
            
            return parsed || {
                competitors: [
                    {
                        name: "DeepSeek Analyzed Competitor",
                        description: "AI-analyzed competitive solution",
                        strengths: ["Market presence", "Established features"],
                        weaknesses: ["Limited innovation", "User experience gaps"]
                    }
                ],
                differentiators: [
                    "AI-powered development approach",
                    "Advanced automation capabilities",
                    "Modern user experience"
                ],
                featureSuggestions: [
                    "Intelligent code generation",
                    "Real-time collaboration",
                    "Advanced analytics dashboard",
                    "Customizable workflows",
                    "Smart automation"
                ]
            };
        } catch (error) {
            console.error('DeepSeek ideation error:', error);
            throw error;
        }
    }

    async generateAppPlan(idea: AppIdea): Promise<AppPlan> {
        const messages = [
            {
                role: 'system',
                content: `You are a Senior Software Architect. Create a comprehensive development plan for the given application idea. Respond in JSON format with the structure:
{
  "projectName": "",
  "description": "",
  "techStack": {"frontend": [], "backend": [], "database": [], "deployment": []},
  "fileStructure": [{"path": "", "type": "file|directory", "children": []}]
}`
            },
            {
                role: 'user',
                content: `Create a complete development plan for this application: "${idea.prompt}"`
            }
        ];

        try {
            const response = await this.chat(messages, 'deepseek-coder');
            const parsed = this.parseJsonResponse<AppPlan>(response);
            
            return parsed || {
                projectName: idea.prompt.split(' ').slice(0, 3).join(' ') || "DeepSeek Project",
                description: `A ${idea.prompt.toLowerCase()} built with AI-assisted development.`,
                techStack: {
                    frontend: ["React", "TypeScript", "Tailwind CSS"],
                    backend: ["Node.js", "Express", "FastAPI"],
                    database: ["PostgreSQL", "Redis"],
                    deployment: ["Docker", "Vercel", "AWS"]
                },
                fileStructure: [
                    {
                        path: "src",
                        type: "directory",
                        children: [
                            { path: "src/index.tsx", type: "file", children: [] },
                            { path: "src/App.tsx", type: "file", children: [] },
                            {
                                path: "src/components",
                                type: "directory",
                                children: [
                                    { path: "src/components/Header.tsx", type: "file", children: [] },
                                    { path: "src/components/Main.tsx", type: "file", children: [] },
                                    { path: "src/components/Footer.tsx", type: "file", children: [] }
                                ]
                            },
                            {
                                path: "src/services",
                                type: "directory",
                                children: [
                                    { path: "src/services/api.ts", type: "file", children: [] },
                                    { path: "src/services/auth.ts", type: "file", children: [] }
                                ]
                            }
                        ]
                    },
                    { path: "package.json", type: "file", children: [] },
                    { path: "tsconfig.json", type: "file", children: [] },
                    { path: "tailwind.config.js", type: "file", children: [] }
                ]
            };
        } catch (error) {
            console.error('DeepSeek plan generation error:', error);
            throw error;
        }
    }

    async generateCode(file: ProjectFile, plan: AppPlan, context: string = ''): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: `You are an expert software developer. Generate production-ready code for the specified file within the given project context. Only return the code, no explanations or markdown formatting.`
            },
            {
                role: 'user',
                content: `Generate code for file: ${file.path}
                
Project: ${plan.projectName}
Description: ${plan.description}
Tech Stack: ${JSON.stringify(plan.techStack)}
Context: ${context}

Generate clean, production-ready code for this file.`
            }
        ];

        try {
            const response = await this.chat(messages, 'deepseek-coder');
            return this.extractCode(response);
        } catch (error) {
            console.error('DeepSeek code generation error:', error);
            throw error;
        }
    }

    async chatWithContext(
        message: string, 
        chatHistory: ChatMessage[], 
        plan?: AppPlan, 
        currentFile?: ProjectFile
    ): Promise<string> {
        const systemMessage = {
            role: 'system',
            content: `You are an expert software development assistant. Help with coding, debugging, architecture, and development questions. Be concise and practical.`
        };

        let contextMessage = '';
        if (plan) {
            contextMessage += `\nProject: ${plan.projectName} - ${plan.description}`;
            contextMessage += `\nTech Stack: ${JSON.stringify(plan.techStack)}`;
        }
        if (currentFile) {
            contextMessage += `\nCurrent File: ${currentFile.path}`;
            if (currentFile.code) {
                contextMessage += `\nFile Content:\n${currentFile.code}`;
            }
        }

        const messages = [
            systemMessage,
            ...(contextMessage ? [{role: 'user', content: `Context:${contextMessage}`}] : []),
            ...chatHistory.slice(-10).map(msg => ({
                role: msg.role === 'system' ? 'assistant' : msg.role,
                content: msg.content
            })),
            {role: 'user', content: message}
        ];

        try {
            return await this.chat(messages as any, 'deepseek-r1');
        } catch (error) {
            console.error('DeepSeek chat with context error:', error);
            throw error;
        }
    }

    async debugCode(code: string, errorMessage: string): Promise<string> {
        const messages = [
            {
                role: 'system',
                content: 'You are a debugging expert. Analyze the code and error, then provide the fixed code. Only return the corrected code.'
            },
            {
                role: 'user',
                content: `Debug this code:

Code:
${code}

Error:
${errorMessage}

Please provide the fixed code.`
            }
        ];

        try {
            const response = await this.chat(messages, 'deepseek-coder');
            return this.extractCode(response);
        } catch (error) {
            console.error('DeepSeek debug error:', error);
            throw error;
        }
    }

    async analyzeCode(files: ProjectFile[], plan?: AppPlan): Promise<string> {
        const filesContext = files.map(f => `${f.path}:\n${f.code || '// Empty file'}`).join('\n\n---\n\n');
        
        const messages = [
            {
                role: 'system',
                content: 'You are a senior code reviewer and architect. Analyze the codebase and provide insights about code quality, architecture, and suggestions for improvements.'
            },
            {
                role: 'user',
                content: `Analyze this codebase:

${plan ? `Project: ${plan.projectName} - ${plan.description}` : ''}

Files:
${filesContext}

Provide analysis and recommendations.`
            }
        ];

        try {
            return await this.chat(messages, 'deepseek-r1');
        } catch (error) {
            console.error('DeepSeek analysis error:', error);
            throw error;
        }
    }

    private parseJsonResponse<T>(text: string): T | null {
        let jsonStr = text.trim();
        
        // Remove markdown code blocks if present
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }
        
        // Try to find JSON in the response
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        try {
            return JSON.parse(jsonStr) as T;
        } catch (e) {
            console.error("Failed to parse JSON response:", e, "Original text:", text);
            return null;
        }
    }

    private extractCode(text: string): string {
        let code = text.trim();
        
        // Remove markdown code blocks
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = code.match(fenceRegex);
        if (match && match[2]) {
            code = match[2].trim();
        }
        
        return code;
    }

    isConfigured(): boolean {
        return !!this.apiKey;
    }
}

// Initialize DeepSeek service
const DEEPSEEK_API_KEY = 'sk-ecd2dbd9e01e45e08cda7463083c3bbc';
export const deepseekService = new DeepSeekService(DEEPSEEK_API_KEY);

export const isDeepSeekConfigured = (): boolean => {
    return deepseekService.isConfigured();
};