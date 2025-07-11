
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types.ts';
import Button from './ui/Button.tsx';
import { Icons } from '../constants.tsx';

interface ChatViewProps {
    history: ChatMessage[];
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    onSimulateError: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ history, onSendMessage, isLoading, onSimulateError }) => {
    const [input, setInput] = useState('');
    const endOfMessagesRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history, isLoading]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    const renderMessage = (msg: ChatMessage) => {
        const isUser = msg.role === 'user';
        const isSystem = msg.role === 'system';
        const Icon = isUser ? Icons.User : Icons.Sparkles;

        if (isSystem) {
            return (
                 <div key={msg.id} className="text-xs text-center text-gray-500 my-2 italic py-1 px-3 bg-gray-800 rounded-full self-center">
                    {msg.content}
                </div>
            )
        }

        return (
            <div key={msg.id} className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`}>
                 {!isUser && (
                     <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-900/50`}>
                       <Icon />
                    </div>
                 )}
                <div className={`p-3 rounded-lg w-fit max-w-xs ${isUser ? 'bg-cyan-700' : 'bg-gray-700'}`}>
                    <p className="text-sm">{msg.content}</p>
                </div>
                 {isUser && (
                     <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-600`}>
                       <Icon />
                    </div>
                 )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-800/50">
            <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-lg font-bold text-white">Orchestrator Chat</h3>
            </div>
            <div className="flex-grow p-4 overflow-y-auto flex flex-col">
                {history.map(renderMessage)}
                {isLoading && (
                     <div className={`flex items-start gap-3 my-4`}>
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-cyan-900/50`}>
                           <Icons.Sparkles />
                        </div>
                        <div className={`p-3 rounded-lg w-fit max-w-xs bg-gray-700`}>
                            <p className="text-sm text-gray-400 italic">Thinking...</p>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                 <button 
                    onClick={onSimulateError}
                    className="w-full mb-2 text-xs bg-yellow-900/50 text-yellow-300 border border-yellow-700 rounded-md py-1 px-2 hover:bg-yellow-800/50 transition flex items-center justify-center gap-2"
                    title="Simulate a production error alert"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Simulate Production Error
                </button>
                <form onSubmit={handleSend} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask for changes or help..."
                        className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} className="px-4">
                        <Icons.Send />
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ChatView;