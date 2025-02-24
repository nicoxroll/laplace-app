export type RepositoryProvider = 'github' | 'gitlab';

export interface BaseRepository {
  id: string;
  name: string;
  full_name: string;
  provider: RepositoryProvider;
  html_url: string;
  description?: string;
  private: boolean;
  default_branch: string;
}

export interface GitHubRepository extends BaseRepository {
  provider: 'github';
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitLabRepository extends BaseRepository {
  provider: 'gitlab';
  namespace: {
    name: string;
    avatar_url: string;
  };
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  provider: 'github' | 'gitlab';
}