
import React from 'react';
import { AppPlan } from '../types.ts';
import Card from './ui/Card.tsx';
import Button from './ui/Button.tsx';
import { Icons } from '../constants.tsx';
import { findFileByPath } from '../utils/fileTree.ts';

interface AppPlanViewProps {
    plan: AppPlan;
    onBuildProject: () => void;
    isBuilding: boolean;
    onRefactorProject: () => void;
    isBuildComplete: boolean;
    isLoading: boolean;
    onGenerateCICD: () => void;
    onGenerateDbMigration: () => void;
    onGenerateApiClient: () => void;
    onSecurityAudit: () => void;
}

const TechPill: React.FC<{tech: string}> = ({ tech }) => (
    <span className="bg-gray-700 text-cyan-300 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap">
        {tech}
    </span>
);

const AppPlanView: React.FC<AppPlanViewProps> = (props) => {
    const { plan, onBuildProject, isBuilding, onRefactorProject, isBuildComplete, isLoading, onGenerateCICD, onGenerateDbMigration, onGenerateApiClient, onSecurityAudit } = props;

    const hasOpenApiFile = !!findFileByPath(plan.fileStructure, 'openapi.yaml');

    return (
        <Card title="Project Plan" className="sticky top-4">
             <div className="space-y-4">
                <div>
                    <h4 className="font-bold text-lg text-white">{plan.projectName}</h4>
                    <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                <div>
                    <h5 className="font-semibold text-cyan-400 mb-2">Tech Stack</h5>
                    <div className="space-y-3 text-sm">
                        <div>
                            <p className="font-medium text-gray-300">Frontend</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {plan.techStack.frontend.map(t => <TechPill key={t} tech={t} />)}
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-gray-300">Backend</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {plan.techStack.backend.map(t => <TechPill key={t} tech={t} />)}
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-gray-300">Database</p>
                             <div className="flex flex-wrap gap-2 mt-1">
                                <TechPill tech={plan.techStack.database} />
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-gray-300">Deployment</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {plan.techStack.deployment.map(t => <TechPill key={t} tech={t} />)}
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="pt-4 border-t border-gray-700 space-y-2">
                    <Button onClick={onBuildProject} disabled={isBuilding || isBuildComplete} className="w-full">
                        <div className="flex items-center justify-center gap-2">
                           <Icons.Build />
                           {isBuilding ? 'Building Project...' : isBuildComplete ? 'Build Complete' : 'Build Full Project'}
                        </div>
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={onGenerateCICD} disabled={isLoading || isBuilding} variant="secondary" className="w-full text-xs px-2">Generate CI/CD</Button>
                        <Button onClick={onGenerateDbMigration} disabled={isLoading || isBuilding} variant="secondary" className="w-full text-xs px-2">DB Migration</Button>
                        <Button onClick={onGenerateApiClient} disabled={isLoading || isBuilding || !hasOpenApiFile} variant="secondary" className="w-full text-xs px-2">API Client SDK</Button>
                        <Button onClick={onSecurityAudit} disabled={isLoading || isBuilding || !isBuildComplete} variant="secondary" className="w-full text-xs px-2">Security Audit</Button>
                    </div>

                    {isBuildComplete && (
                        <Button onClick={onRefactorProject} disabled={isLoading} variant="secondary" className="w-full">
                             <div className="flex items-center justify-center gap-2">
                                <Icons.Wrench />
                                Analyze & Refactor
                             </div>
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default AppPlanView;