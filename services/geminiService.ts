
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AppIdea, AppPlan, ChatMessage, ProjectFile, RefactorPlan, IdeationResult } from '../types.ts';
import { personas } from './personas.ts';
import { deepseekService, isDeepSeekConfigured } from './deepseekService.ts';

// This check is crucial for a web-based app where env vars aren't guaranteed.
const API_KEY = (window as Window & { GEMINI_API_KEY?: string })?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("Gemini API key not found. Please set the GEMINI_API_KEY environment variable.");
}

export const isApiConfigured = () => true; // Always return true to bypass API requirement

// Exported helper to be used across the app
export const parseJsonResponse = <T,>(text: string): T | null => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Original text:", text);
        return null;
    }
};

const extractCode = (text: string): string => {
    let code = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = code.match(fenceRegex);
    if (match && match[2]) {
        code = match[2].trim();
    }
    return code;
}

const callAi = async (model: string, config: any) => {
    if (!ai) throw new Error("Gemini API key not configured.");
    return await ai.models.generateContent({ model, ...config });
}


export const performIdeation = async (idea: AppIdea): Promise<IdeationResult | null> => {
    // Try DeepSeek first if configured
    if (isDeepSeekConfigured()) {
        console.log("Using DeepSeek AI for ideation");
        try {
            return await deepseekService.performIdeation(idea);
        } catch (error) {
            console.warn("DeepSeek ideation failed, falling back to Gemini or mock:", error);
        }
    }
    
    // If Gemini API is not configured, return mock ideation data
    if (!ai) {
        console.log("No AI services configured, returning mock ideation data");
        return {
            competitors: [
                {
                    name: "Generic Competitor 1",
                    description: "A typical app in this category with standard features",
                    strengths: ["Established user base", "Simple interface"],
                    weaknesses: ["Limited features", "Outdated design"]
                },
                {
                    name: "Generic Competitor 2", 
                    description: "Another common approach to this type of application",
                    strengths: ["Good performance", "Cross-platform"],
                    weaknesses: ["Poor user experience", "Expensive pricing"]
                }
            ],
            differentiators: [
                "AI-powered intelligent features (DeepSeek-enhanced)",
                "Modern and intuitive user interface",
                "Seamless integration with popular tools"
            ],
            featureSuggestions: [
                "Smart automation capabilities",
                "Real-time collaboration features",
                "Advanced analytics and insights",
                "Customizable workflows",
                "Mobile-first design"
            ]
        };
    }

    const prompt = "You are a Product Strategist and Market Research Analyst.\n" +"Your task is to analyze a user's application idea and propose unique features to make the app stand out.\n\n" +"**App Idea:** " + idea.prompt + "\n\n" +"**Instructions:**\n" +"1.  Based on your knowledge of similar applications, identify 2-3 main types of competitors for this application idea.\n" +"2.  For each competitor type, briefly describe their typical product approach and list 1-2 key strengths and weaknesses.\n" +"3.  Based on your analysis, generate a list of 3-5 unique \"differentiators\" or \"featureSuggestions\" that would make the user's app more competitive or innovative.\n" +"4.  Respond with a single JSON object containing:\n" +"    - `competitors`: An array of objects, each with `name`, `description`, `strengths`, and `weaknesses`.\n" +"    - `differentiators`: An array of strings describing unique selling points.\n" +"    - `featureSuggestions`: An array of strings for specific new features.\n\n" +"Example response format:\n" +"{\n" +"  \"competitors\": [\n" +"    {\n" +"      \"name\": \"Example App Type 1\",\n" +"      \"description\": \"Brief description of this type of competitor\",\n" +"      \"strengths\": [\"Strength 1\", \"Strength 2\"],\n" +"      \"weaknesses\": [\"Weakness 1\", \"Weakness 2\"]\n" +"    }\n" +"  ],\n" +"  \"differentiators\": [\"Unique selling point 1\", \"Unique selling point 2\"],\n" +"  \"featureSuggestions\": [\"Feature 1\", \"Feature 2\", \"Feature 3\"]\n" +"}\n";
    try {
        const response = await callAi("gemini-2.5-flash-preview-04-17", {
            contents: prompt,
            config: {
                ...personas['Market Analyst'],
                responseMimeType: "application/json",
            },
        });
        const parsed = parseJsonResponse<IdeationResult>(response.text || '');
        return (parsed && parsed.competitors && parsed.featureSuggestions) ? parsed : null;
    } catch(e) {
        console.error("Ideation phase failed:", e);
        // Return mock data as fallback
        return {
            competitors: [
                {
                    name: "Fallback Competitor 1",
                    description: "Standard solution in this space",
                    strengths: ["Market presence", "Basic functionality"],
                    weaknesses: ["Limited innovation", "User experience issues"]
                }
            ],
            differentiators: [
                "Enhanced user experience",
                "Modern technology stack",
                "Better performance"
            ],
            featureSuggestions: [
                "Improved workflow automation",
                "Better mobile experience", 
                "Advanced customization options"
            ]
        };
    }
};

export const refinePromptWithIdeation = async (originalPrompt: string, selectedFeatures: string[]): Promise<string | null> => {
    if (selectedFeatures.length === 0) {
        return originalPrompt;
    }

    const prompt = "You are a Senior Product Manager. Your task is to refine a user's initial application idea by seamlessly integrating a list of selected features.\n\n" +
"**Original Idea:**\n" +
`"${originalPrompt}"` + "\n\n" +
"**Selected Differentiating Features to Integrate:**\n" +
`- ${selectedFeatures.join('\n- ')}` + "\n\n" +
"**Instructions:**\n" +
"Rewrite the \"Original Idea\" into a new, single, cohesive paragraph that sounds like a unified product vision. It should naturally incorporate all the \"Selected Differentiating Features\". Do not just list the features.\n\n" +
"Respond with ONLY the refined paragraph.\n";

    try {
        const response = await callAi("gemini-2.5-flash-preview-04-17", {
            contents: prompt,
            config: {
                ...personas['Product Strategist'],
                temperature: 0.6,
            }
        });
        return response.text?.trim() || originalPrompt;
    } catch (e) {
        console.error("Prompt refinement failed:", e);
        return originalPrompt; // Fallback to original prompt
    }
};


export const generateAppPlan = async (idea: AppIdea): Promise<AppPlan | null> => {
    // Try DeepSeek first if configured
    if (isDeepSeekConfigured()) {
        console.log("Using DeepSeek AI for app plan generation");
        try {
            return await deepseekService.generateAppPlan(idea);
        } catch (error) {
            console.warn("DeepSeek plan generation failed, falling back to Gemini or mock:", error);
        }
    }
    
    // If Gemini API is not configured, return mock app plan
    if (!ai) {
        console.log("No AI services configured, returning mock app plan");
        return {
            projectName: idea.prompt.split(' ').slice(0, 3).join(' ').replace(/[^a-zA-Z0-9\s]/g, '') || "Mock Project",
            description: `A ${idea.prompt.toLowerCase()} built with modern web technologies.`,
            techStack: {
                frontend: ["React", "TypeScript", "Tailwind CSS"],
                backend: ["Node.js", "Express"],
                database: ["SQLite"],
                deployment: ["Vite", "Vercel"]
            },
            fileStructure: [
                {
                    path: "src",
                    type: "directory",
                    children: [
                        { path: "src/index.tsx", name: "index.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                        { path: "src/App.tsx", name: "App.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                        {
                            path: "src/components",
                            type: "directory", 
                            children: [
                                { path: "src/components/Header.tsx", name: "Header.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                                { path: "src/components/Main.tsx", name: "Main.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                                { path: "src/components/Footer.tsx", name: "Footer.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' }
                            ]
                        },
                        {
                            path: "src/styles",
                            type: "directory",
                            children: [
                                { path: "src/styles/index.css", name: "index.css", type: "file", children: [], status: 'planned', testStatus: 'untested' }
                            ]
                        }
                    ]
                },
                { path: "package.json", name: "package.json", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                { path: "tsconfig.json", name: "tsconfig.json", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                { path: "vite.config.ts", name: "vite.config.ts", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                { path: "index.html", name: "index.html", type: "file", children: [], status: 'planned', testStatus: 'untested' }
            ]
        };
    }

    const prompt = "Based on the following application idea, create a comprehensive development plan.\n\n" +
"**App Idea:** " + idea.prompt + "\n" +
(idea.githubRepoUrl ? `\n**Note:** This is an existing project. The file structure should reflect the ingested repository at ${idea.githubRepoUrl}.` : '') + "\n\n" +
"**Instructions:**\n" +
"Generate a JSON object that includes:\n" +
"1.  **projectName**: A catchy, suitable name for the project.\n" +
"2.  **description**: A one-sentence description of the application.\n" +
"3.  **techStack**: An object with keys 'frontend', 'backend', 'database', and 'deployment', each containing an array of recommended technology names (e.g., \"React\", \"Node.js\", \"PostgreSQL\", \"Docker\").\n" +
"4.  **fileStructure**: A recursive array of objects representing the project's file and directory structure. Each object must have:\n" +
"    - **path**: The full path of the file or directory (e.g., \"src/components/Button.tsx\").\n" +
"    - **type**: Either \"file\" or \"directory\".\n" +
"    - **children**: An array of file objects for directories, or an empty array for files.\n\n" +
"**Example of fileStructure:**\n" +
"\"fileStructure\": [\n" +
"  { \"path\": \"src\", \"type\": \"directory\", \"children\": [\n" +
"    { \"path\": \"src/index.tsx\", \"type\": \"file\", \"children\": [] },\n" +
"    { \"path\": \"src/components\", \"type\": \"directory\", \"children\": [\n" +
"      { \"path\": \"src/components/Button.tsx\", \"type\": \"file\", \"children\": [] }\n" +
"    ]}\n" +
"  ]},\n" +
"  { \"path\": \"package.json\", \"type\": \"file\", \"children\": [] }\n" +
"]\n\n" +
"Respond with ONLY the JSON object.\n";

    try {
        const response: GenerateContentResponse = await callAi('gemini-2.5-flash-preview-04-17', {
            contents: prompt,
            config: {
                ...personas['Software Architect'],
                responseMimeType: "application/json",
                temperature: 0.5,
            }
        });

        return parseJsonResponse<AppPlan>(response.text || '');
    } catch(e) {
        console.error("App plan generation failed:", e);
        // Return fallback mock plan
        return {
            projectName: "Fallback App",
            description: "A fallback application plan when API is unavailable.",
            techStack: {
                frontend: ["React", "TypeScript"],
                backend: ["Node.js"],
                database: ["SQLite"],
                deployment: ["Vite"]
            },
            fileStructure: [
                {
                    path: "src",
                    type: "directory",
                    children: [
                        { path: "src/index.tsx", name: "index.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' },
                        { path: "src/App.tsx", name: "App.tsx", type: "file", children: [], status: 'planned', testStatus: 'untested' }
                    ]
                },
                { path: "package.json", name: "package.json", type: "file", children: [], status: 'planned', testStatus: 'untested' }
            ]
        };
    }
};


export const generatePlanFromImage = async (appIdea: string, imageBase64: string): Promise<AppPlan | null> => {
     const imagePart = {
        inlineData: {
            mimeType: 'image/png',
            data: imageBase64,
        },
    };
    const textPart = {
        text: "You are a UI/UX expert and software architect. Analyze this image of a web interface design.\n" +
"Based on the design and the user's general idea, create a complete development plan.\n\n" +
"**App Idea:** " + appIdea + "\n\n" +
"**Instructions:**\n" +
"Analyze the image and generate a JSON object that includes:\n" +
"1.  **projectName**: A catchy name for the project.\n" +
"2.  **description**: A one-sentence description.\n" +
"3.  **techStack**: A recommended tech stack (frontend, backend, database, deployment). Assume React with TailwindCSS for the frontend.\n" +
"4.  **fileStructure**: A detailed file structure based on the components you see in the image. For example, if you see a header, a sidebar, and a main content area, create files like `src/components/Header.tsx`, `src/components/Sidebar.tsx`, etc.\n\n" +
"Respond with ONLY the JSON object.\n"
    };

    const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: { parts: [textPart, imagePart] },
        config: {
            ...personas['UI/UX Expert'],
            responseMimeType: "application/json",
            temperature: 0.4,
        }
    });
     return parseJsonResponse<AppPlan>(response.text || '');
};


export const generateCodeForFile = async (file: ProjectFile, plan: AppPlan, knowledge: string, allFiles: ProjectFile[]): Promise<{ code: string, planModificationRequest?: any }> => {
    const fileTree = allFiles.map(f => f.path).join('\n');
    
    const contextFiles = allFiles.filter(f => f.status === 'generated' || f.status === 'modified');
    const contextCode = contextFiles.map(f => `
// File: ${f.path}
\`\`\`
${f.code}
\`\`\`
`).join('\n\n---\n\n');

    const prompt = "Generate production-ready code for a specific file within a larger application plan.\n\n" +
"**Project Name:** " + plan.projectName + "\n" +
"**Project Description:** " + plan.description + "\n" +
"**Tech Stack:** " + JSON.stringify(plan.techStack) + "\n\n" +
"**Relevant Knowledge from Past Successes:**\n" +
(knowledge || "No specific knowledge applies to this file.") + "\n\n" +
"**Full File Structure:**\n" +
fileTree + "\n\n---\n\n" +
"**Code from other relevant files for context:**\n" +
(contextCode || "No other files have been generated yet.") + "\n\n---\n\n" +
"**Current File to Generate:**\n" +
"Path: " + file.path + "\n\n" +
"**Instructions:**\n" +
"1.  Generate the code for the specified file path: " + file.path + ".\n" +
"2.  The code should be based on the project's tech stack and its purpose within the file structure.\n" +
"3.  Use the provided context from other files to ensure consistency, correct imports, and proper function/component usage.\n" +
"4.  **Adaptive Planning**: If you determine that a new file is necessary to support the current file (e.g., a new CSS file, a utility function), respond with a JSON object containing a 'planModificationRequest' key. Otherwise, respond with raw code.\n" +
"    - Example JSON for creating a new file: `{\"planModificationRequest\": {\"action\": \"createFile\", \"path\": \"src/components/Button.css\", \"reason\": \"Extracted styles for the button component.\"}, \"code\": \"import './Button.css';\\n// ... rest of Button.tsx code\"}`\n" +
"5.  Respond with only the raw code for the file, unless making a plan modification request. Do not include explanations, file paths, or markdown fences in the raw code response.\n";
    
    let persona = personas['Full-Stack Developer'];
    if (file.path.includes('src/components') || file.path.endsWith('.css') || file.path.endsWith('tailwind.config.js')) {
        persona = personas['Frontend Expert'];
    } else if (file.path.startsWith('src/server') || file.path.startsWith('src/api') || file.path.endsWith('controller.js')) {
        persona = personas['Backend Expert'];
    }


    const response: GenerateContentResponse = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: {
            ...persona,
            temperature: 0.3,
        }
    });

    const responseText = response.text?.trim() || '';
    const parsedJson = parseJsonResponse<{ code: string, planModificationRequest?: any }>(responseText);

    if (parsedJson && parsedJson.code) {
        return parsedJson;
    }
    
    return { code: extractCode(responseText) };
};

export const chatWithOrchestrator = async (history: ChatMessage[], plan: AppPlan | null, currentFile: ProjectFile | null): Promise<string> => {
    let persona = { ...personas['Orchestrator'] };

    let systemInstruction = persona.systemInstruction;
    systemInstruction += "\n- If the user asks to \"change\", \"refactor\", \"add\", \"fix\", or otherwise modify the code, assume they are referring to the currently open file. \n" +
"- When modifying code, you MUST respond with a single JSON object with two keys: \"explanation\" (a string describing the change) and \"code\" (a string containing the complete, updated code for the file).\n" +
"- If you are not modifying code, respond with a plain string.\n\n" +
"Current Project Context:\n";

    if (plan) {
        systemInstruction += `**Project Name:** ${plan.projectName}\n`;
        systemInstruction += `**Description:** ${plan.description}\n`;
        systemInstruction += `**Tech Stack:** ${JSON.stringify(plan.techStack)}\n`;
        systemInstruction += `**File Structure:**\n${plan.fileStructure.map(f => f.path).join('\n')}\n`;
    }

    if (currentFile) {
        systemInstruction += "\n**Currently Viewing File: " + currentFile.path + "**\n" +
"```\n" + (currentFile.code || '// This file has not been generated yet.') + "\n```";
    }
    
    const contents = history.map(msg => ({
        role: msg.role === 'system' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
    }));
    
    const response: GenerateContentResponse = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: [...contents],
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
        }
    });

    return response.text?.trim() || '';
};

export const generateTestError = async (code: string): Promise<{ isSuccess: boolean; errorMessage?: string }> => {
    const prompt = "You are a QA Engineer reviewing a piece of code.\n" +
"With a 30% probability, find a plausible-sounding bug in the code. If you find a bug, create a fake error message for it.\n" +
"If you don't find a bug (70% probability), declare it a success.\n\n" +
"**Code:**\n" +
"```\n" + code + "\n```\n\n" +
"Respond with ONLY a JSON object with one or two keys:\n" +
"1.  `isSuccess`: a boolean (`true` or `false`).\n" +
"2.  `errorMessage`: a string with the fake error message if `isSuccess` is `false`.\n";
    const response = await callAi('gemini-2.5-flash-preview-04-17', {

        contents: prompt,
        config: {
            ...personas['QA Engineer'],
            responseMimeType: "application/json",
            temperature: 1,
        }
    });
    return parseJsonResponse<{ isSuccess: boolean; errorMessage?: string }>(response.text || '') ?? { isSuccess: true };
};

export const debugCode = async (failingCode: string, errorMessage: string): Promise<string> => {
    const prompt = "The following code has failed a test with a specific error message.\n" +
"Your task is to analyze the code and the error, fix the bug, and return the complete, corrected code.\n\n" +
"**Error Message:**\n" +
"```\n" + errorMessage + "\n```\n\n" +
"**Failing Code:**\n" +
"```\n" + failingCode + "\n```\n\n" +
"Respond with ONLY the full, corrected code. Do not add any explanations or markdown fences.\n";
    const response = await callAi('gemini-2.5-flash-preview-04-17', {

        contents: prompt,
        config: {
            ...personas['Debugger'],
            temperature: 0.2,
        }
    });
    return extractCode(response.text || '');
};


export const checkForMissingDependencies = async (errorMessage: string): Promise<string | null> => {
     const prompt = "You are a dependency analysis bot. You analyze error messages to see if they are caused by a missing npm package.\n\n" +
"**Error Message:**\n" +
"```\n" + errorMessage + "\n```\n\n" +
"**Instructions:**\n" +
"If the error message indicates a missing package (e.g., \"Cannot find module 'react-router-dom'\", \"Module not found: Error: Can't resolve 'axios'\"), respond with a JSON object containing the name of the missing package: `{\"packageName\": \"axios\"}`.\n" +
"If the error is not a missing dependency, respond with: `{\"packageName\": null}`.\n";
    const response = await callAi('gemini-2.5-flash-preview-04-17', {

        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
    });
    const result = parseJsonResponse<{packageName: string | null}>(response.text || '');
    return result?.packageName ?? null;
}

export const addPackageDependency = async (packageJsonCode: string, packageName: string): Promise<string> => {
    const prompt = "You are a build engineer. Add a new dependency to the provided package.json content.
" +
"Use the latest version for the new package.

" +
"**Package to add:** " + packageName + "

" +
"**Current package.json:**
" +
"```json

" + packageJsonCode + "
```

" +
"Respond with ONLY the complete, updated content of the package.json file.
";
}

    const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: {
            ...personas['DevOps Engineer'],
            temperature: 0,
        }
    });
    return extractCode(response.text || '');
};

export const refactorCodebase = async (allFiles: ProjectFile[]): Promise<RefactorPlan | null> => {
    const contextCode = allFiles
        .filter(f => f.code)
        .map(f => `
// File: ${f.path}
\`\`\`
${f.code}
\`\`\`
`).join('\n\n---\n\n');

    const prompt = `
Analyze the full source code of the following files. Identify any repeated logic, poor patterns, or opportunities for abstraction (e.g., creating a reusable function, component, or custom hook).

**Full Codebase:**
${contextCode}

**Instructions:**
1.  If you find a good opportunity for refactoring, create a plan.
2.  Your plan must be a JSON object with three keys:
    - \`reasoning\`: A string explaining why the refactoring is needed and what it will accomplish.
    - \`newFile\`: (Optional) An object with \`path\` and \`code\` for a new utility file to be created.
    - \`filesToUpdate\`: An array of objects, each with a \`path\` and the \`newCode\` for an existing file that needs to be updated to use the new abstraction.
3. If no significant refactoring is needed, respond with \`null\`.
`;

    const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: {
            ...personas['Senior Architect'],
            responseMimeType: "application/json",
            temperature: 0.4,
        }
    });

    const text = response.text?.trim() || '';
    if (text.toLowerCase() === 'null') {
        return null;
    }
    return parseJsonResponse<RefactorPlan>(text);
};


export const performSelfDirectedLearning = async (plan: AppPlan): Promise<{searchQuery: string; insight: string} | null> => {
    const prompt = `
You are an R&D engineer for an autonomous software development team. Your goal is to use your idle time to research ways to improve the current project.

**Current Project Plan:**
- **Name:** ${plan.projectName}
- **Description:** ${plan.description}
- **Tech Stack:** ${JSON.stringify(plan.techStack, null, 2)}

**Instructions:**
1.  Formulate a single, highly relevant search query to find a best practice, a security improvement, a performance optimization, or a better implementation pattern related to the project's tech stack and description.
2.  Use the provided Google Search tool to execute this query.
3.  Analyze the search results.
4.  Synthesize your findings into a single, concise, and actionable insight. This insight should be a suggestion that could be directly applied to the project.
5.  Respond with a single JSON object containing two keys: "searchQuery" (the exact query you used) and "insight" (your synthesized recommendation).

**Example of a good insight:** "For our real-time collaborative app, instead of basic REST endpoints for chat, we should use WebSockets with the 'ws' library on our Node.js backend for much lower latency and better user experience."

Do not respond with anything other than the JSON object.
`;

    try {
        const response = await callAi("gemini-2.5-flash-preview-04-17", {
            contents: prompt,
            config: {
                ...personas['Orchestrator'],
                tools: [{googleSearch: {}}],
                responseMimeType: "application/json",
            },
        });

        const parsed = parseJsonResponse<{searchQuery: string; insight: string}>(response.text || '');
        if (parsed && parsed.insight && parsed.searchQuery) {
            return parsed;
        }
        return null;
    } catch(e) {
        console.error("Self-directed learning failed:", e);
        return null;
    }
};

export const generateCICDFile = async (plan: AppPlan): Promise<string | null> => {
    const prompt = "Based on the project's tech stack, generate a complete, best-practice GitHub Actions workflow file (`ci.yml`) for CI/CD.\n\n" +
"**Project Tech Stack:**\n" +
"- Frontend: " + plan.techStack.frontend.join(', ') + "\n" +
"- Backend: " + plan.techStack.backend.join(', ') + "\n" +
"- Database: " + plan.techStack.database + "\n\n" +
"**Requirements:**\n" +
"- The workflow should trigger on push/pull_request to the main branch.\n" +
"- Include jobs for:\n" +
"  - Linting the code.\n" +
"  - Running tests (you can assume `npm test`).\n" +
"  - Building the application (you can assume `npm run build`).\n" +
"- Use a Node.js environment.\n\n" +
"Respond with ONLY the raw YAML content for the `ci.yml` file.\n";

    const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: { ...personas['DevOps Engineer'] }
    });
    return extractCode(response.text || '');
};


export const generateApiClient = async (openapiSpec: string): Promise<string | null> => {
    const prompt = "You are given an OpenAPI 3.0 specification.\n" +
"Your task is to generate a fully-typed TypeScript client/SDK for consuming this API.\n" +
"The client should be self-contained in a single file and use the 'axios' library for making HTTP requests.\n\n" +
"**OpenAPI Specification:**\n" +
"```yaml\n" + openapiSpec + "\n```\n\n" +
"Respond with ONLY the raw TypeScript code for the generated client.\n";

     const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: { ...personas['Backend Expert'] }
    });
    return extractCode(response.text || '');
};

export const generateMigrationFile = async (plan: AppPlan): Promise<string | null> => {
    const prompt = "Based on the project plan, generate an SQL migration file to create the necessary tables.\n\n" +
"**Project:** " + plan.projectName + "\n" +
"**Description:** " + plan.description + "\n" +
"**Database:** " + plan.techStack.database + "\n\n" +
"**Instructions:**\n" +
"- Analyze the project description and infer the required tables and columns.\n" +
"- For a collaborative whiteboard app, you might need 'users', 'whiteboards', and 'elements' tables.\n" +
"- Generate the 'CREATE TABLE' SQL statements.\n" +
"- Use appropriate data types for a PostgreSQL database.\n\n" +
"Respond with ONLY the raw SQL code for the migration file.\n";

    const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: { ...personas['DB Architect'] }
    });
    return extractCode(response.text || '');
};

export const runSecurityAudit = async (plan: AppPlan, files: ProjectFile[]): Promise<string> => {
    const packageJson = files.find(f => f.path === 'package.json')?.code || '{}';
    const allCode = files.filter(f => f.code && f.path.endsWith('.tsx')).map(f => `// ${f.path}\n${f.code}`).join('\n\n');

    const prompt = "Perform a brief security audit of the provided project.\n\n" +
"**Project:** " + plan.projectName + "\n" +
"**Tech Stack:** " + JSON.stringify(plan.techStack) + "\n\n" +
"**package.json:**\n" +
"```json\n" + packageJson + "\n```\n\n" +
"**Source Code Sample:**\n" +
"```typescript\n" + allCode.substring(0, 4000) + "...\n```\n\n" +
"**Instructions:**\n" +
"1.  Analyze the dependencies in `package.json` for any obvious or common vulnerabilities.\n" +
"2.  Briefly scan the source code for common web vulnerabilities (e.g., use of `dangerouslySetInnerHTML` in React, potential XSS vectors).\n" +
"3.  Provide a short, summary report of your findings. If no issues are found, state that. Format the output as plain text.\n\n" +
"Respond with ONLY the text-based summary report.\n";

     const response = await callAi('gemini-2.5-flash-preview-04-17', {
        contents: prompt,
        config: { ...personas['Security Analyst'] }
    });
    return response.text || '';
};
