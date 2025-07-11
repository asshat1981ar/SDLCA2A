
import React, { useState } from 'react';
import { AppIdea } from '../types.ts';
import Button from './ui/Button.tsx';
import { Icons } from '../constants.tsx';
import { APP_TITLE } from '../constants.tsx';

interface AppInputFormProps {
    onSubmit: (idea: AppIdea) => void;
    isLoading: boolean;
    error: string | null;
}

const AppInputForm: React.FC<AppInputFormProps> = ({ onSubmit, isLoading, error }) => {
    const [prompt, setPrompt] = useState('');
    const [githubRepoUrl, setGithubRepoUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() || githubRepoUrl.trim()) {
            onSubmit({ prompt, githubRepoUrl });
        }
    };
    
    const setExample = () => {
        setPrompt('A real-time collaborative whiteboard app where users can draw together, add sticky notes, and chat.');
        setGithubRepoUrl('');
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-2xl mx-auto">
                <div className="bg-gray-800/50 p-8 rounded-2xl shadow-2xl border border-gray-700">
                    <div className="text-center mb-8">
                        <div className="inline-block bg-cyan-900/50 p-3 rounded-full mb-4 border border-cyan-700">
                           <Icons.Sparkles />
                        </div>
                        <h1 className="text-4xl font-bold text-white">{APP_TITLE}</h1>
                        <p className="text-gray-400 mt-2">Describe a new app idea, or provide a GitHub repo to modify.</p>
                    </div>

                    {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6" role="alert">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="prompt" className="sr-only">App Idea</label>
                            <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={3}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition placeholder-gray-500"
                                placeholder="e.g., A simple markdown note-taking app with folder organization..."
                            />
                        </div>

                         <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-gray-700" />
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-gray-800 px-2 text-sm text-gray-400">or</span>
                            </div>
                        </div>

                        <div>
                             <label htmlFor="githubRepoUrl" className="sr-only">GitHub Repository URL</label>
                            <input
                                id="githubRepoUrl"
                                type="text"
                                value={githubRepoUrl}
                                onChange={(e) => setGithubRepoUrl(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition placeholder-gray-500"
                                placeholder="Paste a public GitHub repository URL to ingest..."
                            />
                        </div>


                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button type="button" onClick={setExample} variant="secondary" className="w-full sm:w-auto">
                                Use Example
                            </Button>
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto flex-grow">
                                {isLoading ? 'Analyzing...' : 'Analyze Idea'}
                            </Button>
                        </div>
                    </form>
                </div>
                 <footer className="text-center p-4 text-gray-500 text-sm mt-8">
                    Powered by Gemini API. All content is AI-generated.
                </footer>
            </div>
        </div>
    );
};

export default AppInputForm;