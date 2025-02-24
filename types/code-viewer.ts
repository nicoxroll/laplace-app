import { Repository } from './repository';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileNode[];
}

export interface CodeViewerProps {
  repository: Repository;
}