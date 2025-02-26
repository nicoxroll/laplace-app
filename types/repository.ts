export type RepositoryProvider = "github" | "gitlab";

export type FileType = "file" | "image" | "binary";

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
  type: FileType;
  content?: string;
  encoding?: string;
  url?: string;
  raw_url?: string;
  download_url?: string;
  size?: number;
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
    type: FileType;
    raw_url?: string;
  };
}

export interface RepositoryListProps {
  onSelect: (repository: string) => void;
  selectedRepo: string | null;
  className?: string;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
  };
}

export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    date: string;
  };
}
