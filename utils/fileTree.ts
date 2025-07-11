
import { ProjectFile, AppPlan } from '../types.ts';

export const findFileByPath = (files: ProjectFile[], path: string): ProjectFile | null => {
    for (const file of files) {
        if (file.path === path) {
            return file;
        }
        if (file.type === 'directory' && file.children && path.startsWith(file.path + '/')) {
            const found = findFileByPath(file.children, path);
            if (found) {
                return found;
            }
        }
    }
    return null;
};

export const updateFileByPath = (
    prevState: AppPlan,
    path: string,
    updates: Partial<ProjectFile>
): AppPlan => {

    const updater = (files: ProjectFile[]): ProjectFile[] => {
        return files.map(file => {
            if (file.path === path) {
                return { ...file, ...updates };
            }
            if (file.type === 'directory' && file.children && path.startsWith(file.path + '/')) {
                return { ...file, children: updater(file.children) };
            }
            return file;
        });
    }
    
    return {
        ...prevState,
        fileStructure: updater(prevState.fileStructure)
    };
};

export const addFileByPath = (prevState: AppPlan, path: string): AppPlan => {
    const newFileStructure = [...prevState.fileStructure];
    const pathParts = path.split('/');
    let currentLevel = newFileStructure;
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLastPart = i === pathParts.length - 1;

        let node = currentLevel.find(item => item.path === currentPath);
        if (!node) {
            node = {
                path: currentPath,
                type: isLastPart ? 'file' : 'directory',
                status: 'planned',
                testStatus: 'untested',
                children: isLastPart ? undefined : [],
            };
            currentLevel.push(node);
            currentLevel.sort((a,b) => a.path.localeCompare(b.path));
        }

        if (node.type === 'directory') {
            if (!node.children) {
                node.children = [];
            }
            currentLevel = node.children;
        }
    }

    return {
        ...prevState,
        fileStructure: newFileStructure,
    };
};


export const flattenFileTree = (files: ProjectFile[]): ProjectFile[] => {
    let allFiles: ProjectFile[] = [];
    for (const file of files) {
        allFiles.push(file);
        if (file.type === 'directory' && file.children) {
            allFiles = allFiles.concat(flattenFileTree(file.children));
        }
    }
    return allFiles;
};
