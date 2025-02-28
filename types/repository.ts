import { RepositoryProvider, VisibilityType } from './common';
import { GitHubUser, GitLabUser } from './user';
import { RepositoryFile, CurrentFile } from './files';

export type FileType = "file" | "image" | "binary";
export type TreeItemType = "dir" | "file";

interface BaseOwner {
  avatar_url: string;
}

interface GitHubOwner extends BaseOwner {
  login: string;
}

interface GitLabOwner extends BaseOwner {
  name: string;
}

// Interfaces base para repositorios
interface BaseRepository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  visibility: VisibilityType;
  default_branch: string;
  html_url: string;
  provider: RepositoryProvider;
  created_at: string;
  updated_at: string;
  language?: string;
  topics?: string[];
}

export interface GitHubRepository extends BaseRepository {
  provider: "github";
  owner: GitHubUser;
  fork: boolean;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
}

export interface GitLabRepository extends BaseRepository {
  provider: "gitlab";
  namespace: GitLabUser;
  star_count: number;
  forks_count: number;
}

export type Repository = GitHubRepository | GitLabRepository;

export interface BaseFile {
  name: string;
  path: string;
  type: FileType;
  size?: number;
}

export interface RepositoryFile extends BaseFile {
  content?: string;
  encoding?: string;
  url?: string;
  raw_url?: string;
  download_url?: string;
}

export interface CurrentFile extends BaseFile {
  content: string[];
  language?: string;
  raw_url?: string;
}

// Interfaces para control de versiones
export interface Commit {
  sha: string;
  message: string;
  author: {
    name: string;
    email?: string;
    date: string;
  };
  committer?: {
    name: string;
    email?: string;
    date: string;
  };
  html_url?: string;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url?: string;
  };
  protected?: boolean;
}

// Interfaces para el contexto
export interface RepositoryContext {
  provider: RepositoryProvider;
  repository: Repository;
  currentPath: string;
  files: RepositoryFile[];
  currentFile?: CurrentFile;
  branch?: string;
}

// Props interfaces
export interface RepositoryListProps {
  onSelect: (repository: string) => void;
  selectedRepo: string | null;
  className?: string;
}

// Interfaces para estadísticas
export interface RepositoryStats {
  commits_count: number;
  branches_count: number;
  contributors_count: number;
  open_issues_count: number;
  open_prs_count: number;
  last_activity: string;
}

export interface TreeItem {
  name: string;
  path: string;
  type: TreeItemType;
}
