
import React from 'react';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { Icons } from '../constants.tsx';
import { GitHubSettings, ApiSettings, ApiProviderType, ModelType } from '../types.ts';

interface SettingsPanelProps {
    settings: GitHubSettings;
    onSettingsChange: (newSettings: GitHubSettings) => void;
    apiSettings: ApiSettings;
    onApiSettingsChange: (newSettings: ApiSettings) => void;
    onDeploy: () => void;
    onDownloadZip: () => void;
    onSyncIssues: () => void;
    isLoading: boolean;
    isApiConfigured: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, apiSettings, onApiSettingsChange, onDeploy, onDownloadZip, onSyncIssues, isLoading, isApiConfigured }) => {

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onSettingsChange({ ...settings, [name]: value });
    };

    const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const provider = e.target.value as ApiProviderType;
        let defaultModel: ModelType = 'gemini-flash';
        
        switch (provider) {
            case 'deepseek':
                defaultModel = 'deepseek-coder';
                break;
            case 'claude-code':
                defaultModel = 'claude-code-cli';
                break;
            case 'openai':
                defaultModel = 'gpt-4';
                break;
            case 'anthropic':
                defaultModel = 'claude-3';
                break;
            default:
                defaultModel = 'gemini-flash';
        }
        
        onApiSettingsChange({ ...apiSettings, provider, model: defaultModel });
    };

    const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const model = e.target.value as ModelType;
        onApiSettingsChange({ ...apiSettings, model });
    };

    const getAvailableModels = (provider: ApiProviderType): ModelType[] => {
        switch (provider) {
            case 'deepseek':
                return ['deepseek-coder', 'deepseek-r1'];
            case 'claude-code':
                return ['claude-code-cli'];
            case 'openai':
                return ['gpt-4'];
            case 'anthropic':
                return ['claude-3'];
            case 'gemini':
            default:
                return ['gemini-flash'];
        }
    };

    const getProviderStatus = (provider: ApiProviderType): { isConfigured: boolean; displayName: string } => {
        switch (provider) {
            case 'deepseek':
                return { isConfigured: true, displayName: 'DeepSeek AI' };
            case 'claude-code':
                return { isConfigured: true, displayName: 'Claude Code CLI' };
            case 'gemini':
                return { isConfigured: isApiConfigured, displayName: 'Gemini AI' };
            case 'openai':
                return { isConfigured: false, displayName: 'OpenAI' };
            case 'anthropic':
                return { isConfigured: false, displayName: 'Anthropic' };
            default:
                return { isConfigured: false, displayName: 'Unknown' };
        }
    };

    const providerStatus = getProviderStatus(apiSettings.provider);
    const availableModels = getAvailableModels(apiSettings.provider);

    return (
        <Card title="Settings & Deployment">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">AI Provider</label>
                    <select
                        value={apiSettings.provider}
                        onChange={handleProviderChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                    >
                        <option value="deepseek">DeepSeek AI</option>
                        <option value="claude-code">Claude Code CLI</option>
                        <option value="gemini">Gemini AI</option>
                        <option value="openai">OpenAI</option>
                        <option value="anthropic">Anthropic</option>
                    </select>
                    <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mt-2 ${providerStatus.isConfigured ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                        {providerStatus.isConfigured ? '✅ Configured' : '❌ Not Configured'}
                    </div>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Model</label>
                    <select
                        value={apiSettings.model}
                        onChange={handleModelChange}
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                    >
                        {availableModels.map(model => (
                            <option key={model} value={model}>
                                {model === 'deepseek-coder' ? 'DeepSeek Coder' :
                                 model === 'deepseek-r1' ? 'DeepSeek R1' :
                                 model === 'claude-code-cli' ? 'Claude Code CLI' :
                                 model === 'gemini-flash' ? 'Gemini Flash' :
                                 model === 'gpt-4' ? 'GPT-4' :
                                 model === 'claude-3' ? 'Claude 3' :
                                 model}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="token" className="block text-sm font-medium text-gray-300">GitHub Token</label>
                    <input
                        type="password"
                        id="token"
                        name="token"
                        value={settings.token}
                        onChange={handleInputChange}
                        className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        placeholder="ghp_..."
                    />
                </div>
                 <div>
                    <label htmlFor="repoName" className="block text-sm font-medium text-gray-300">GitHub Repo (owner/repo)</label>
                    <input
                        type="text"
                        id="repoName"
                        name="repoName"
                        value={settings.repoName}
                        onChange={handleInputChange}
                        className="mt-1 w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none transition"
                        placeholder="your-username/my-new-app"
                    />
                </div>
                 <div className="pt-4 border-t border-gray-700 space-y-2">
                     <Button onClick={onDeploy} disabled={isLoading || !settings.token || !settings.repoName} className="w-full">
                        <Icons.GitHub /> <span className="ml-2">Deploy to GitHub</span>
                    </Button>
                    <Button onClick={onSyncIssues} disabled={isLoading || !settings.token || !settings.repoName} variant="secondary" className="w-full text-sm">
                        Sync Tasks to GitHub Issues
                    </Button>
                     <Button onClick={onDownloadZip} disabled={isLoading} variant="secondary" className="w-full text-sm">
                        Download Project (.zip)
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default SettingsPanel;
