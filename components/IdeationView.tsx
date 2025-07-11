
import React, { useState } from 'react';
import { IdeationResult } from '../types.ts';
import Button from './ui/Button.tsx';
import { Icons } from '../constants.tsx';
import Card from './ui/Card.tsx';

interface IdeationViewProps {
    result: IdeationResult;
    onSubmit: (selectedFeatures: string[]) => void;
    isLoading: boolean;
}

const IdeationView: React.FC<IdeationViewProps> = ({ result, onSubmit, isLoading }) => {
    const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

    const handleFeatureToggle = (feature: string) => {
        setSelectedFeatures(prev =>
            prev.includes(feature)
                ? prev.filter(f => f !== feature)
                : [...prev, feature]
        );
    };

    const handleSubmit = () => {
        onSubmit(selectedFeatures);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-4xl mx-auto">
                <Card title="Ideation & Market Analysis">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Competitors */}
                        <div className="space-y-6">
                            <h4 className="text-xl font-bold text-cyan-400">Competitive Landscape</h4>
                             {result.competitors.map(comp => (
                                <div key={comp.name} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                    <h5 className="font-semibold text-white">{comp.name}</h5>
                                    <p className="text-sm text-gray-400 mt-1 mb-3">{comp.description}</p>
                                    <div className="text-xs">
                                        <p><strong className="text-green-400">Strengths:</strong> {comp.strengths.join(', ')}</p>
                                        <p><strong className="text-red-400">Weaknesses:</strong> {comp.weaknesses.join(', ')}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Right Column: Suggestions & Final Plan */}
                        <div className="space-y-6">
                             <div>
                                <h4 className="text-xl font-bold text-cyan-400 flex items-center gap-2"><Icons.Lightbulb /> Suggested Features</h4>
                                <p className="text-sm text-gray-400 mt-1">Select features to add to your original idea.</p>
                                <div className="mt-4 space-y-2">
                                    {[...result.differentiators, ...result.featureSuggestions].map((feature, index) => (
                                        <label key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-700/50 border border-gray-700 cursor-pointer transition">
                                            <input
                                                type="checkbox"
                                                checked={selectedFeatures.includes(feature)}
                                                onChange={() => handleFeatureToggle(feature)}
                                                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500"
                                            />
                                            <span className="text-sm text-gray-200">{feature}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t border-gray-700 pt-6">
                                 <p className="text-sm text-gray-400 mb-4">Your original idea will be automatically combined with your selected features to create the final plan.</p>
                                 <Button onClick={handleSubmit} disabled={isLoading} className="w-full">
                                    {isLoading ? 'Planning...' : 'Finalize Idea & Start Planning'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default IdeationView;
