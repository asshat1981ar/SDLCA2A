
import React, { useState } from 'react';
import { ProjectFile } from '../types.ts';
import Card from './ui/Card.tsx';
import { Icons } from '../constants.tsx';
import { getStatusColor } from '../utils/statusColors.ts';

interface FileTreeViewProps {
    files: ProjectFile[];
    selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
}

const TestStatusIcon: React.FC<{status: ProjectFile['testStatus']}> = ({ status }) => {
    switch(status) {
        case 'passing':
            return <Icons.Check />;
        case 'failing':
            return <span className="text-red-500 font-bold">×</span>;
        default:
            return <div className="w-5 h-5 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full border border-gray-500"></div>
            </div>;
    }
}

const FileNode: React.FC<{ 
    node: ProjectFile; 
    selectedFilePath: string | null;
    onSelectFile: (path: string) => void;
    level: number;
}> = ({ node, selectedFilePath, onSelectFile, level }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isDirectory = node.type === 'directory';

    const handleSelect = () => {
        if (isDirectory) {
            setIsOpen(!isOpen);
        } else {
            onSelectFile(node.path);
        }
    };

    const statusColor = getStatusColor(node.status || 'pending');
    
    const Icon = isDirectory ? Icons.Folder : Icons.Document;
    const baseClasses = `flex items-center gap-2 w-full text-left text-sm py-1.5 px-2 rounded cursor-pointer transition-colors duration-150`;
    const selectedClasses = !isDirectory && selectedFilePath === node.path ? 'bg-cyan-900/50 text-white' : 'text-gray-300 hover:bg-gray-700/50';

    return (
        <div>
            <button 
                onClick={handleSelect} 
                className={`${baseClasses} ${selectedClasses}`} 
                style={{ paddingLeft: `${level * 1 + 0.5}rem`}}
                role={isDirectory ? "treeitem" : "button"}
                aria-expanded={isDirectory ? isOpen : undefined}
                aria-label={isDirectory ? `${node.name} folder` : `${node.name} file`}
            >
                <Icon />
                <span className="truncate flex-grow">{node.name}</span>
                {!isDirectory && <span className={`mr-1 font-mono text-xs ${statusColor}`}>●</span>}
                {!isDirectory && <div className={`${node.testStatus === 'passing' ? 'text-green-400' : 'text-gray-500'}`}><TestStatusIcon status={node.testStatus} /></div>}
            </button>
            {isDirectory && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileNode key={child.path} node={child} selectedFilePath={selectedFilePath} onSelectFile={onSelectFile} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

const FileTreeView: React.FC<FileTreeViewProps> = ({ files, selectedFilePath, onSelectFile }) => {
    return (
        <Card title="File Structure">
             <div 
                className="space-y-1 max-h-96 overflow-y-auto"
                role="tree"
                aria-label="Project file structure"
            >
                {files.map((node) => (
                    <FileNode key={node.path} node={node} selectedFilePath={selectedFilePath} onSelectFile={onSelectFile} level={0} />
                ))}
            </div>
        </Card>
    );
};

export default FileTreeView;
