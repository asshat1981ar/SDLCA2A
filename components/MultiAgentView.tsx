
import React, { useRef } from 'react';
import { Agent } from '../types.ts';
import Card from './ui/Card.tsx';
import Spinner from './ui/Spinner.tsx';
import { Icons } from '../constants.tsx';
import Button from './ui/Button.tsx';
import A2AAgentPanel from './A2AAgentPanel.tsx';

interface MultiAgentViewProps {
    agents: Agent[];
    onImageUpload: (file: File) => void;
}

const AgentRow: React.FC<{agent: Agent}> = ({ agent }) => {
    const isIdle = agent.status === 'Idle';
    return (
        <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50">
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-full ${isIdle ? 'bg-gray-600' : 'bg-cyan-900'}`}>
                    <Icons.Cpu />
                </div>
                <div>
                    <p className="font-bold text-sm text-white">{agent.name}</p>
                    <p className="text-xs text-gray-400">{agent.role}</p>
                </div>
            </div>
             <div className="flex items-center gap-2">
                {agent.status !== 'Idle' && <Spinner />}
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${isIdle ? 'bg-gray-600 text-gray-300' : 'bg-cyan-600 text-white'}`}>
                    {agent.status}
                </span>
            </div>
        </div>
    );
};


const MultiAgentView: React.FC<MultiAgentViewProps> = ({ agents, onImageUpload }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImageUpload(file);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <Card title="AI Agent Team">
             <div className="space-y-2">
                {agents.map(agent => <AgentRow key={agent.name} agent={agent} />)}
            </div>
            <div className="mt-4">
                 <Button onClick={handleButtonClick} variant="secondary" className="w-full py-2 text-sm">
                    <Icons.Upload />
                    <span className="ml-2">Upload Design Mockup</span>
                </Button>
                <input 
                    ref={fileInputRef}
                    id="file-upload" 
                    type="file" 
                    className="hidden" 
                    accept="image/png, image/jpeg"
                    onChange={handleFileUpload}
                />
            </div>
        </Card>
        
        {/* A2A Agent Panel */}
        <A2AAgentPanel className="mt-4" />
    );
};

export default MultiAgentView;