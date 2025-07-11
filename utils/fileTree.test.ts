import { describe, it, expect } from 'vitest';
import { findFileByPath, updateFileByPath, addFileByPath, flattenFileTree } from './fileTree';
import { ProjectFile, AppPlan } from '../types';

describe('fileTree utilities', () => {
  const mockFiles: ProjectFile[] = [
    {
      path: 'src',
      type: 'directory',
      status: 'planned',
      testStatus: 'untested',
      children: [
        {
          path: 'src/index.ts',
          type: 'file',
          status: 'generated',
          testStatus: 'passing',
          code: 'console.log("hello");'
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
    {
      path: 'package.json',
      type: 'file',
      status: 'generated',
      testStatus: 'untested',
      code: '{"name": "test"}'
    }
  ];

  const mockAppPlan: AppPlan = {
    projectName: 'Test Project',
    description: 'Test Description',
    techStack: {
      frontend: ['React'],
      backend: ['Node.js'],
      database: 'PostgreSQL',
      deployment: ['Vercel']
    },
    fileStructure: mockFiles
  };

  describe('findFileByPath', () => {
    it('should find a file in the root directory', () => {
      const result = findFileByPath(mockFiles, 'package.json');
      expect(result).toBeTruthy();
      expect(result?.path).toBe('package.json');
      expect(result?.type).toBe('file');
    });

    it('should find a file in a nested directory', () => {
      const result = findFileByPath(mockFiles, 'src/index.ts');
      expect(result).toBeTruthy();
      expect(result?.path).toBe('src/index.ts');
      expect(result?.code).toBe('console.log("hello");');
    });

    it('should find a file in a deeply nested directory', () => {
      const result = findFileByPath(mockFiles, 'src/utils/helper.ts');
      expect(result).toBeTruthy();
      expect(result?.path).toBe('src/utils/helper.ts');
    });

    it('should return null for non-existent file', () => {
      const result = findFileByPath(mockFiles, 'nonexistent.ts');
      expect(result).toBeNull();
    });

    it('should return null for partial path match', () => {
      const result = findFileByPath(mockFiles, 'src/index');
      expect(result).toBeNull();
    });
  });

  describe('updateFileByPath', () => {
    it('should update a file in the root directory', () => {
      const result = updateFileByPath(mockAppPlan, 'package.json', { 
        status: 'modified',
        code: '{"name": "updated"}'
      });
      
      const updatedFile = findFileByPath(result.fileStructure, 'package.json');
      expect(updatedFile?.status).toBe('modified');
      expect(updatedFile?.code).toBe('{"name": "updated"}');
    });

    it('should update a file in a nested directory', () => {
      const result = updateFileByPath(mockAppPlan, 'src/index.ts', { 
        status: 'modified',
        testStatus: 'failing'
      });
      
      const updatedFile = findFileByPath(result.fileStructure, 'src/index.ts');
      expect(updatedFile?.status).toBe('modified');
      expect(updatedFile?.testStatus).toBe('failing');
    });

    it('should not modify other files', () => {
      const result = updateFileByPath(mockAppPlan, 'src/index.ts', { status: 'modified' });
      
      const otherFile = findFileByPath(result.fileStructure, 'package.json');
      expect(otherFile?.status).toBe('generated');
    });

    it('should preserve original structure when file not found', () => {
      const result = updateFileByPath(mockAppPlan, 'nonexistent.ts', { status: 'modified' });
      expect(result.fileStructure).toEqual(mockFiles);
    });
  });

  describe('addFileByPath', () => {
    it('should add a file to the root directory', () => {
      const result = addFileByPath(mockAppPlan, 'README.md');
      
      const addedFile = findFileByPath(result.fileStructure, 'README.md');
      expect(addedFile).toBeTruthy();
      expect(addedFile?.type).toBe('file');
      expect(addedFile?.status).toBe('planned');
    });

    it('should add a file to an existing directory', () => {
      const result = addFileByPath(mockAppPlan, 'src/components/Button.tsx');
      
      const addedFile = findFileByPath(result.fileStructure, 'src/components/Button.tsx');
      expect(addedFile).toBeTruthy();
      expect(addedFile?.type).toBe('file');
    });

    it('should create intermediate directories', () => {
      const result = addFileByPath(mockAppPlan, 'src/components/ui/Button.tsx');
      
      const componentsDir = findFileByPath(result.fileStructure, 'src/components');
      const uiDir = findFileByPath(result.fileStructure, 'src/components/ui');
      const buttonFile = findFileByPath(result.fileStructure, 'src/components/ui/Button.tsx');
      
      expect(componentsDir?.type).toBe('directory');
      expect(uiDir?.type).toBe('directory');
      expect(buttonFile?.type).toBe('file');
    });

    it('should sort files alphabetically', () => {
      let result = addFileByPath(mockAppPlan, 'zebra.txt');
      result = addFileByPath(result, 'alpha.txt');
      
      const rootFiles = result.fileStructure.filter(f => f.type === 'file');
      const fileNames = rootFiles.map(f => f.path);
      expect(fileNames).toEqual(['alpha.txt', 'package.json', 'zebra.txt']);
    });
  });

  describe('flattenFileTree', () => {
    it('should flatten a nested file structure', () => {
      const result = flattenFileTree(mockFiles);
      
      expect(result).toHaveLength(5);
      expect(result.map(f => f.path)).toEqual([
        'src',
        'src/index.ts',
        'src/utils',
        'src/utils/helper.ts',
        'package.json'
      ]);
    });

    it('should handle empty file structure', () => {
      const result = flattenFileTree([]);
      expect(result).toEqual([]);
    });

    it('should handle file structure with only files', () => {
      const files: ProjectFile[] = [
        { path: 'file1.txt', type: 'file', status: 'planned', testStatus: 'untested' },
        { path: 'file2.txt', type: 'file', status: 'planned', testStatus: 'untested' }
      ];
      
      const result = flattenFileTree(files);
      expect(result).toHaveLength(2);
      expect(result).toEqual(files);
    });
  });
});