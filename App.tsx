

import React, { useEffect, useReducer, useState } from 'react';
import { useProjectOrchestrator } from './hooks/useProjectOrchestrator.ts';
import { APP_TITLE, Icons } from './constants.tsx';
import AppInputForm from './components/AppInputForm.tsx';
import IdeationView from './components/IdeationView.tsx';
import AppPlanView from './components/AppPlanView.tsx';
import FileTreeView from './components/FileTreeView.tsx';
import CodeEditor from './components/CodeEditor.tsx';
import ChatView from './components/ChatView.tsx';
import MultiAgentView from './components/MultiAgentView.tsx';
import SettingsPanel from './components/SettingsPanel.tsx';
import Tabs from './components/ui/Tabs.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { isApiConfigured } from './services/geminiService.ts';
import { loadProjectState } from './services/stateService.ts';
import { reducer, initialState } from './reducer.ts';
import { findFileByPath, flattenFileTree } from './utils/fileTree.ts';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { 
        projectPhase, projectPlan, ideationResult, originalPrompt, chatHistory, 
        isLoading, loadingMessage, error, selectedFilePath, livePreviewHtml, terminalOutput,
        agents, githubSettings, apiSettings,
    } = state;

    const [isApiReady, setIsApiReady] = useState(true);
    
    // All business logic is now encapsulated in the orchestrator hook
    const orchestrator = useProjectOrchestrator(state, dispatch);

    useEffect(() => {
        setIsApiReady(isApiConfigured());
        const savedState = loadProjectState();
        if (savedState) {
            dispatch({ type: 'SET_STATE_FROM_LOAD', payload: savedState });
        }
    }, []);

    if (!isApiReady) {
        return (
            <div className="h-screen w-screen bg-gray-900 text-white flex flex-col items-center justify-center p-8 text-center">
                 <h1 className="text-3xl font-bold text-red-500 mb-4">Configuration Needed</h1>
                <p className="max-w-md">The Gemini API key has not been configured. Please set the <code className="bg-gray-700 p-1 rounded">GEMINI_API_KEY</code> environment variable in your system and restart the application. This application cannot function without it.</p>
            </div>
        )
    }

    const renderContent = () => {
        switch (projectPhase) {
            case 'IDEA_INPUT':
                return <AppInputForm onSubmit={orchestrator.handleAppIdeaSubmit} isLoading={isLoading} error={error} />;
            case 'IDEATION':
                 if (!ideationResult) return <div className="text-center p-8 text-white">Loading ideation...</div>;
                 return <IdeationView 
                    result={ideationResult} 
                    originalPrompt={originalPrompt} 
                    onSubmit={orchestrator.handleFinalizeIdea} 
                    isLoading={isLoading} 
                />;
            case 'CODING':
                 if (!projectPlan) return <div className="text-center p-8 text-white">Loading project plan...</div>;
                 const selectedFile = selectedFilePath ? findFileByPath(projectPlan.fileStructure, selectedFilePath) : null;
                 const isBuildComplete = !flattenFileTree(projectPlan.fileStructure).some(f => f.type === 'file' && f.status === 'planned');
                 
                 return (
                    <div className="h-screen w-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
                        <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-3 flex-shrink-0">
                             <div className="container mx-auto flex justify-between items-center">
                                <h1 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                                    <Icons.Sparkles /> {projectPlan.projectName || APP_TITLE}
                                </h1>
                                {isLoading && <div className="text-center text-sm text-gray-400 animate-pulse">{loadingMessage}</div>}
                                <button
                                    onClick={() => dispatch({ type: 'RESET_STATE' })}
                                    className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                                >
                                    New Project
                                </button>
                            </div>
                        </header>
                         <div className="flex-grow flex overflow-hidden">
                             <aside className="w-1/4 xl:w-1/5 bg-gray-800/30 flex flex-col gap-6 overflow-y-auto">
                                <Tabs tabs={[
                                    { label: 'Files', content: <FileTreeView files={projectPlan.fileStructure} selectedFilePath={selectedFilePath} onSelectFile={orchestrator.handleSelectFile} /> },
                                    { label: 'Plan', content: <AppPlanView
                                        plan={projectPlan}
                                        onBuildProject={orchestrator.handleBuildProject}
                                        isBuilding={state.isBuilding}
                                        onRefactorProject={orchestrator.handleRefactorProject}
                                        isBuildComplete={isBuildComplete}
                                        isLoading={isLoading}
                                        onGenerateCICD={orchestrator.handleGenerateCICD}
                                        onGenerateDbMigration={orchestrator.handleGenerateDbMigration}
                                        onGenerateApiClient={orchestrator.handleGenerateApiClient}
                                        onSecurityAudit={orchestrator.handleSecurityAudit}
                                    /> },
                                    { label: 'Agents', content: <MultiAgentView agents={agents} onImageUpload={orchestrator.handleImageUpload} /> },
                                    { label: 'Settings', content: <SettingsPanel
                                        settings={githubSettings}
                                        onSettingsChange={orchestrator.handleSetGithubSettings}
                                        apiSettings={apiSettings}
                                        onApiSettingsChange={orchestrator.handleSetApiSettings}
                                        onDeploy={orchestrator.handleDeployToGithub}
                                        onDownloadZip={orchestrator.handleDownloadZip}
                                        onSyncIssues={orchestrator.handleSyncIssues}
                                        isLoading={isLoading}
                                        isApiConfigured={isApiReady}
                                    /> },
                                ]} />
                            </aside>
                             <main className="w-1/2 xl:w-3/5 flex flex-col">
                                <CodeEditor
                                    selectedFile={selectedFile}
                                    onGenerateCode={() => selectedFilePath && orchestrator.handleGenerateCode(selectedFilePath)}
                                    onCodeChange={orchestrator.handleCodeChange}
                                    onRunTests={orchestrator.handleRunTests}
                                    isLoading={isLoading}
                                    livePreviewHtml={livePreviewHtml}
                                    terminalOutput={terminalOutput}
                                />
                                {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg m-4" role="alert">{error}</div>}
                            </main>
                             <aside className="w-1/4 xl:w-1/5 bg-gray-900/50 border-l border-gray-700 flex flex-col">
                            <ChatView
                                    history={chatHistory}
                                    onSendMessage={orchestrator.handleSendMessage}
                                    isLoading={isLoading}
                                    onSimulateError={orchestrator.handleSimulateProductionError}
                                />
                            </aside>
                        </div>
                    </div>
                );
            default:
                 return <div>Invalid project phase. Please restart.</div>;
        }
    }

    return (
        <ErrorBoundary>
            <div className="h-screen w-screen">{renderContent()}</div>
        </ErrorBoundary>
    );
};

export default App;