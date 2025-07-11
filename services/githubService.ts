
import GitHub from 'github-api';
import { AppPlan, ProjectFile } from '../types.ts';
import { flattenFileTree } from '../utils/fileTree.ts';

const getRepo = (token: string, repoName: string) => {
    const gh = new GitHub({ token });
    // Assumes repoName is in the format "owner/repo"
    const [owner, repo] = repoName.split('/');
    if (!owner || !repo) {
        throw new Error("Invalid repository name format. Expected 'owner/repo'.");
    }
    return gh.getRepo(owner, repo);
};

export const ingestRepo = async (repoUrl: string): Promise<AppPlan | null> => {
    const urlParts = repoUrl.replace('https://github.com/', '').split('/');
    const owner = urlParts[0];
    const repoName = urlParts[1];

    if (!owner || !repoName) {
        throw new Error("Invalid GitHub URL");
    }

    const gh = new GitHub(); // No auth needed for public repos
    const repo = gh.getRepo(owner, repoName);

    const { data: mainBranch } = await repo.getBranch('main').catch(() => repo.getBranch('master'));
    if (!mainBranch) return null;

    const { data: tree } = await repo.getTree(mainBranch.commit.sha, true); // Recursive tree

    const fileStructure: ProjectFile[] = [];
    const dirMap: { [key: string]: ProjectFile } = {};
    const filePromises: Promise<void>[] = [];

    for (const item of tree.tree) {
        const pathParts = item.path.split('/');
        let currentPath = '';

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            
            if (!dirMap[currentPath]) {
                 const node: ProjectFile = {
                    path: currentPath,
                    type: i === pathParts.length - 1 && item.type === 'blob' ? 'file' : 'directory',
                    status: 'generated',
                    testStatus: 'untested',
                    children: i < pathParts.length - 1 || item.type === 'tree' ? [] : undefined
                };
                dirMap[currentPath] = node;

                if (i === 0) {
                     fileStructure.push(node);
                } else {
                    const parentPath = pathParts.slice(0, i).join('/');
                    const parentNode = dirMap[parentPath];
                    if (parentNode && parentNode.children) {
                        parentNode.children.push(node);
                    }
                }
            }
        }
        
        if (item.type === 'blob' && item.sha) {
            const fileNode = dirMap[item.path];
            filePromises.push(
                repo.getBlob(item.sha).then(({ data }: { data: any }) => {
                    // Decode base64 content
                    try {
                        fileNode.code = atob(data);
                    } catch(e) {
                        // Sometimes it's not base64, it's just text
                        fileNode.code = data;
                    }
                })
            );
        }
    }
    
    await Promise.all(filePromises);

    return {
        projectName: repoName,
        description: `Ingested from ${repoUrl}`,
        techStack: { frontend: ["Ingested"], backend: ["Ingested"], database: ['Ingested'], deployment: ["Ingested"] },
        fileStructure
    };
};

export const deployToGithub = async (token: string, repoFullName: string, files: ProjectFile[], commitMessage: string): Promise<void> => {
    const gh = new GitHub({ token });
    const [owner, repoName] = repoFullName.split('/');
    let repo = gh.getRepo(owner, repoName);

    try {
        await repo.getDetails();
    } catch (e) {
        // Repo doesn't exist, create it
        const user = gh.getUser();
        await user.createRepo({ name: repoName });
        repo = gh.getRepo(owner, repoName);
    }
    
    const fileBlobs = await Promise.all(
        flattenFileTree(files)
            .filter(f => f.type === 'file' && f.code)
            .map(async (file) => {
                const { data: blob } = await repo.createBlob(file.code!);
                return {
                    path: file.path,
                    mode: '100644', // file
                    type: 'blob',
                    sha: blob.sha,
                };
            })
    );

    const mainBranchRef = `heads/main`;
    let parentCommitSha;
    try {
        const { data: mainBranch } = await repo.getRef(mainBranchRef);
        parentCommitSha = mainBranch.object.sha;
    } catch (e) {
        // Branch doesn't exist, this will be the first commit
        parentCommitSha = null;
    }
    
    const { data: tree } = await repo.createTree(fileBlobs);
    const { data: commit } = await repo.commit(parentCommitSha, tree.sha, commitMessage);
    
    if (parentCommitSha) {
         await repo.updateHead(mainBranchRef, commit.sha);
    } else {
         await repo.createRef({ ref: `refs/${mainBranchRef}`, sha: commit.sha });
    }
};

export const createGithubProject = async (token: string, repoFullName: string, projectName: string): Promise<void> => {
    const repo = getRepo(token, repoFullName);
    await repo.createProject({
        name: `${projectName} - Development Board`,
        body: `Agile board for the ${projectName} project, managed by the Autonomous SDLC Agent.`
    });
};

export const createProjectIssue = async (token: string, repoFullName: string, title: string, body: string): Promise<void> => {
    const repo = getRepo(token, repoFullName);
    await repo.createIssue({
        title,
        body,
        labels: ['autogenerated', 'task']
    });
};
