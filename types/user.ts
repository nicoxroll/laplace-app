import { RepositoryProvider } from './common';

// Interfaces base para usuarios
interface BaseUser {
  id: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface GitHubUser extends BaseUser {
  provider: 'github';
  login: string;
  type: 'User' | 'Organization';
  html_url: string;
}

export interface GitLabUser extends BaseUser {
  provider: 'gitlab';
  name: string;
  username: string;
  state: string;
  web_url: string;
}

export type User = GitHubUser | GitLabUser;

// Interfaces para autenticación
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  provider: RepositoryProvider;
  accessToken: string;
}

export interface Session {
  user: AuthUser;
  expires: string;
} 