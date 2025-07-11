import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveProjectState, loadProjectState } from './stateService';
import { ProjectState } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('stateService', () => {
  const mockProjectState: ProjectState = {
    projectPhase: 'PLANNING',
    projectPlan: {
      projectName: 'Test Project',
      description: 'A test project',
      techStack: {
        frontend: ['React'],
        backend: ['Node.js'],
        database: 'PostgreSQL',
        deployment: ['Vercel']
      },
      fileStructure: [
        {
          path: 'src/index.ts',
          type: 'file',
          status: 'generated',
          testStatus: 'passing'
        },
        {
          path: 'src/utils',
          type: 'directory',
          status: 'planned',
          testStatus: 'untested',
          children: [
            {
              path: 'src/utils/helper.ts',
              type: 'file',
              status: 'planned',
              testStatus: 'untested'
            }
          ]
        }
      ]
    },
    ideationResult: null,
    originalPrompt: 'Build a test app',
    chatHistory: [],
    isLoading: false,
    loadingMessage: '',
    error: null,
    selectedFilePath: null,
    livePreviewHtml: null,
    terminalOutput: [],
    isBuilding: false,
    agents: [],
    githubSettings: {
      token: '',
      repoName: ''
    },
    apiSettings: {
      provider: 'gemini',
      model: 'gemini-flash',
      gemini: '',
      openAI: '',
      anthropic: '',
      claudeCode: ''
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  describe('saveProjectState', () => {
    it('should save state to localStorage', () => {
      saveProjectState(mockProjectState);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'autonomous-sdlc-project',
        JSON.stringify(mockProjectState)
      );
    });

    it('should handle JSON.stringify errors gracefully', () => {
      const circularState = { ...mockProjectState };
      // Create circular reference
      (circularState as any).circular = circularState;
      
      saveProjectState(circularState);
      
      expect(console.error).toHaveBeenCalledWith(
        'Could not save project state to local storage:',
        expect.any(Error)
      );
    });

    it('should handle localStorage.setItem errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      saveProjectState(mockProjectState);
      
      expect(console.error).toHaveBeenCalledWith(
        'Could not save project state to local storage:',
        expect.any(Error)
      );
    });
  });

  describe('loadProjectState', () => {
    it('should load state from localStorage', () => {
      const serializedState = JSON.stringify(mockProjectState);
      localStorageMock.getItem.mockReturnValue(serializedState);
      
      const result = loadProjectState();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('autonomous-sdlc-project');
      expect(result).toEqual(mockProjectState);
    });

    it('should return null when no state exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = loadProjectState();
      
      expect(result).toBeNull();
    });

    it('should handle JSON.parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = loadProjectState();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Could not load project state from local storage:',
        expect.any(Error)
      );
    });

    it('should handle localStorage.getItem errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });
      
      const result = loadProjectState();
      
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        'Could not load project state from local storage:',
        expect.any(Error)
      );
    });

    it('should add default testStatus to files without it', () => {
      const stateWithoutTestStatus = {
        ...mockProjectState,
        projectPlan: {
          ...mockProjectState.projectPlan!,
          fileStructure: [
            {
              path: 'src/index.ts',
              type: 'file' as const,
              status: 'generated' as const,
              // testStatus is missing
            }
          ]
        }
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stateWithoutTestStatus));
      
      const result = loadProjectState();
      
      expect(result?.projectPlan?.fileStructure[0].testStatus).toBe('untested');
    });

    it('should handle state without projectPlan', () => {
      const stateWithoutProjectPlan = {
        ...mockProjectState,
        projectPlan: null
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stateWithoutProjectPlan));
      
      const result = loadProjectState();
      
      expect(result).toEqual(stateWithoutProjectPlan);
    });
  });
});