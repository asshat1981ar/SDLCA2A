
const KNOWLEDGE_BASE_KEY = 'knowledge-base';

interface Knowledge {
    [filePath: string]: string; // Maps file path to its successful code
}

const loadKnowledgeBase = (): Knowledge => {
    try {
        const stored = localStorage.getItem(KNOWLEDGE_BASE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error("Failed to load knowledge base:", e);
        return {};
    }
};

const saveKnowledgeBase = (kb: Knowledge): void => {
    try {
        localStorage.setItem(KNOWLEDGE_BASE_KEY, JSON.stringify(kb));
    } catch (e) {
        console.error("Failed to save knowledge base:", e);
    }
};

export const learnFromSuccess = (filePath: string, code: string): void => {
    if (!filePath || !code) return;
    const kb = loadKnowledgeBase();
    kb[filePath] = code; // Overwrite with the latest successful version
    saveKnowledgeBase(kb);
};

export const getRelevantKnowledge = (filePath: string): string => {
    const kb = loadKnowledgeBase();
    
    // Simple relevance: find knowledge for the same file path or similar file types
    const pathParts = filePath.split('/');
    const fileName = pathParts.pop() || '';
    const fileExt = fileName.split('.').pop() || '';

    let relevantKnowledge = ``;
    
    // Knowledge for the exact same file
    if (kb[filePath]) {
        relevantKnowledge += `// Previously successful code for this exact file (${filePath}):\n\`\`\`\n${kb[filePath]}\n\`\`\`\n\n`;
    }

    // Find knowledge for similar file types (e.g., other components)
    const similarFiles = Object.keys(kb).filter(
        key => key !== filePath && key.endsWith(`.${fileExt}`)
    );

    if (similarFiles.length > 0) {
        const randomSimilarFile = similarFiles[Math.floor(Math.random() * similarFiles.length)];
        relevantKnowledge += `// Example of a similar successful file (${randomSimilarFile}):\n\`\`\`\n${kb[randomSimilarFile]}\n\`\`\``;
    }
    
    return relevantKnowledge;
};
