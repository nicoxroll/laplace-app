import type { Repository } from './repository';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
  url?: string;
}

export interface CodeViewerProps {
  repository: {
    id: number;
    full_name: string;
    provider: 'github' | 'gitlab';
  };
}