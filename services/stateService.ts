
import { ProjectState } from '../types.ts';
import { flattenFileTree } from '../utils/fileTree.ts';

const LOCAL_STORAGE_KEY = 'autonomous-sdlc-project';

export const saveProjectState = (state: ProjectState): void => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (error) {
        console.error("Could not save project state to local storage:", error);
    }
};

export const loadProjectState = (): ProjectState | null => {
    try {
        const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (serializedState === null) {
            return null;
        }
        const state: ProjectState = JSON.parse(serializedState);
        // Add default values for new properties if loading old state
        if (state.projectPlan) {
            const allFiles = flattenFileTree(state.projectPlan.fileStructure);
            allFiles.forEach(file => {
                if (!file.testStatus) {
                    file.testStatus = 'untested';
                }
            });
        }
        return state;
    } catch (error) {
        console.error("Could not load project state from local storage:", error);
        return null;
    }
};
