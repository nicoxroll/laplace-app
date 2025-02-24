import { Session } from 'next-auth';
import { Repository, GitHubRepository, GitLabRepository } from '../types/repository';

export type RepositoryProvider = 'github' | 'gitlab';


export async function fetchRepositories(session: Session): Promise<Repository[]> {
  if (!session?.accessToken || !session?.provider) {
    throw new Error('No authentication token available');
  }

  try {
    switch (session.provider) {
      case 'github':
        return await fetchGitHubRepositories(session.accessToken);
      case 'gitlab':
        return await fetchGitLabRepositories(session.accessToken);
      default:
        throw new Error(`Unsupported provider: ${session.provider}`);
    }
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
}

async function fetchGitHubRepositories(token: string): Promise<GitHubRepository[]> {
  const response = await fetch('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.map((repo: any): GitHubRepository => ({
    id: repo.id.toString(),
    name: repo.name,
    full_name: repo.full_name,
    provider: 'github',
    html_url: repo.html_url,
    description: repo.description || undefined,
    private: repo.private,
    default_branch: repo.default_branch,
    owner: {
      login: repo.owner.login,
      avatar_url: repo.owner.avatar_url,
    },
  }));
}

async function fetchGitLabRepositories(token: string): Promise<GitLabRepository[]> {
  const response = await fetch('https://gitlab.com/api/v4/projects?membership=true', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GitLab API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.map((repo: any): GitLabRepository => ({
    id: repo.id.toString(),
    name: repo.name,
    full_name: repo.path_with_namespace,
    provider: 'gitlab',
    html_url: repo.web_url,
    description: repo.description || undefined,
    private: !repo.public,
    default_branch: repo.default_branch,
    namespace: {
      name: repo.namespace.name,
      avatar_url: repo.namespace.avatar_url,
    },
  }));
}

export async function getRepository(
  session: Session, 
  repoFullName: string
): Promise<Repository | null> {
  if (!session?.accessToken || !session?.provider) {
    throw new Error('No authentication token available');
  }

  try {
    switch (session.provider) {
      case 'github':
        const [owner, repo] = repoFullName.split('/');
        const githubResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: 'application/vnd.github+json',
            },
          }
        );

        if (!githubResponse.ok) return null;
        
        const githubData = await githubResponse.json();
        return {
          id: githubData.id.toString(),
          name: githubData.name,
          full_name: githubData.full_name,
          provider: 'github',
          html_url: githubData.html_url,
          description: githubData.description || undefined,
          private: githubData.private,
          default_branch: githubData.default_branch,
          owner: {
            login: githubData.owner.login,
            avatar_url: githubData.owner.avatar_url,
          },
        };

      case 'gitlab':
        const gitlabResponse = await fetch(
          `https://gitlab.com/api/v4/projects/${encodeURIComponent(repoFullName)}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
            },
          }
        );

        if (!gitlabResponse.ok) return null;

        const gitlabData = await gitlabResponse.json();
        return {
          id: gitlabData.id.toString(),
          name: gitlabData.name,
          full_name: gitlabData.path_with_namespace,
          provider: 'gitlab',
          html_url: gitlabData.web_url,
          description: gitlabData.description || undefined,
          private: !gitlabData.public,
          default_branch: gitlabData.default_branch,
          namespace: {
            name: gitlabData.namespace.name,
            avatar_url: gitlabData.namespace.avatar_url,
          },
        };

      default:
        return null;
    }
  } catch (error) {
    console.error('Error fetching repository:', error);
    return null;
  }
}