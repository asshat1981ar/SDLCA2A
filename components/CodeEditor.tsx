
import React, { useState, useEffect, useRef } from 'react';
import { ProjectFile, TerminalEntry } from '../types.ts';
import Button from './ui/Button.tsx';
import Spinner from './ui/Spinner.tsx';
import { Icons } from '../constants.tsx';

interface CodeEditorProps {
    selectedFile: ProjectFile | null;
    onGenerateCode: () => void;
    onCodeChange: (newCode: string) => void;
    onRunTests: () => void;
    isLoading: boolean;
    livePreviewHtml: string | null;
    terminalOutput: TerminalEntry[];
}

const getStatusColor = (status: TerminalEntry['status']) => {
    switch (status) {
        case 'success': return 'text-green-400';
        case 'error': return 'text-red-400';
        case 'warning': return 'text-yellow-400';
        default: return 'text-gray-400';
    }
}

const CodeEditor: React.FC<CodeEditorProps> = ({ selectedFile, onGenerateCode, onCodeChange, onRunTests, isLoading, livePreviewHtml, terminalOutput }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'terminal'>('editor');
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // When a new file is selected, switch back to the editor tab
        if (selectedFile) {
            setActiveTab('editor');
        }
    }, [selectedFile]);

    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [terminalOutput]);

    const handleCopy = () => {
        if (selectedFile?.code) {
            navigator.clipboard.writeText(selectedFile.code);
            setIsCopied(true);
        }
    };

    if (!selectedFile) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center bg-gray-800/30 rounded-lg">
                <Icons.CodeBracket />
                <h3 className="mt-4 text-lg font-medium text-white">Select a file</h3>
                <p className="mt-1 text-sm text-gray-400">Choose a file from the tree to view or generate its code.</p>
            </div>
        );
    }
    
    const hasCode = selectedFile.code && selectedFile.code.length > 0;
    const isGenerating = isLoading && selectedFile.status === 'generating';

    return (
        <div className="h-full bg-gray-800/50 border border-gray-700 rounded-lg flex flex-col">
            <div className="px-4 pt-2 border-b border-gray-700 flex justify-between items-end flex-shrink-0">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                    <TabButton isActive={activeTab === 'editor'} onClick={() => setActiveTab('editor')}>
                        <Icons.CodeBracket /> Code Editor
                    </TabButton>
                    <TabButton isActive={activeTab === 'preview'} onClick={() => setActiveTab('preview')} disabled={!livePreviewHtml}>
                        <Icons.Eye /> Live Preview
                    </TabButton>
                     <TabButton isActive={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')}>
                        <span className="font-mono text-lg leading-none">&gt;</span> Terminal
                    </TabButton>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center gap-4 pb-2">
                    {hasCode && (
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                            title="Copy code to clipboard"
                        >
                            {isCopied ? <Icons.Check /> : <Icons.Clipboard />}
                            {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                    )}
                     <Button onClick={onRunTests} disabled={!hasCode || isLoading} variant="secondary" className="py-1 px-3 text-sm flex items-center gap-2">
                        <Icons.Beaker /> Run Tests
                    </Button>
                    <Button onClick={onGenerateCode} disabled={isLoading} variant="secondary" className="py-1 px-3 text-sm">
                        {isGenerating ? 'Generating...' : 'Generate Code'}
                    </Button>
                </div>
            </div>

            <div className="flex-grow relative overflow-hidden">
                {isGenerating && (
                    <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-10">
                        <Spinner />
                        <span className="ml-4 text-gray-300">AI is writing code...</span>
                    </div>
                )}
                <div className={`w-full h-full ${activeTab === 'editor' ? 'block' : 'hidden'}`}>
                    <textarea
                        value={selectedFile.code || ''}
                        onChange={(e) => onCodeChange(e.target.value)}
                        placeholder={hasCode ? "" : "Click 'Generate Code' to have the AI write this file..."}
                        className="w-full h-full p-4 bg-gray-900 text-sm font-mono resize-none border-0 focus:ring-0 placeholder-gray-500"
                        spellCheck="false"
                    />
                </div>
                <div className={`w-full h-full ${activeTab === 'preview' ? 'block' : 'hidden'}`}>
                    {livePreviewHtml ? (
                         <iframe
                            srcDoc={livePreviewHtml}
                            title="Live Preview"
                            className="w-full h-full bg-white border-0"
                            sandbox="allow-scripts allow-same-origin"
                          />
                    ) : (
                         <div className="h-full flex flex-col items-center justify-center text-center">
                            <Icons.Eye />
                            <h3 className="mt-4 text-lg font-medium text-white">No Preview Available</h3>
                            <p className="mt-1 text-sm text-gray-400">Select an HTML file to see a live preview.</p>
                        </div>
                    )}
                </div>
                <div className={`w-full h-full p-4 bg-black text-sm font-mono overflow-y-auto ${activeTab === 'terminal' ? 'block' : 'hidden'}`}>
                   {terminalOutput.map((entry, index) => (
                       <p key={index} className="whitespace-pre-wrap">
                           <span className="text-cyan-400">[{entry.agent}]</span>
                           <span className={`ml-2 ${getStatusColor(entry.status)}`}>{entry.message}</span>
                       </p>
                   ))}
                   <div ref={terminalEndRef} />
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{isActive: boolean, onClick: () => void, disabled?: boolean, children: React.ReactNode}> = ({ isActive, onClick, disabled, children}) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors";
    const activeClasses = "border-cyan-400 text-cyan-400";
    const inactiveClasses = "border-transparent text-gray-400 hover:text-white hover:border-gray-500";
    const disabledClasses = "disabled:text-gray-600 disabled:cursor-not-allowed hover:disabled:border-transparent";

    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${disabled ? disabledClasses : ''}`}>
            {children}
        </button>
    );
}

export default CodeEditor;
