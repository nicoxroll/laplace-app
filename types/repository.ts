export type RepositoryProvider = "github" | "gitlab";

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
  provider: "github";
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface GitLabRepository extends BaseRepository {
  provider: "gitlab";
  namespace: {
    name: string;
    avatar_url: string;
  };
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  default_branch: string;
  private: boolean;
  provider: RepositoryProvider;
}

export interface RepositoryFile {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string[];
  language?: string;
  children?: RepositoryFile[];
}

export interface RepositoryContext {
  provider: RepositoryProvider;
  repository: Repository;
  currentPath: string;
  files: RepositoryFile[];
  currentFile?: {
    path: string;
    content: string[];
    language?: string;
  };
}

export interface RepositoryListProps {
  onSelect: (repository: string) => void;
  selectedRepo: string | null;
  className?: string;
}
