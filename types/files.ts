import { FileType, TreeItemType } from './common';

// Interfaces base para archivos
export interface BaseFile {
  name: string;
  path: string;
  type: FileType;
  size?: number;
  sha?: string;
  mode?: string;
}

export interface RepositoryFile extends BaseFile {
  content?: string;
  encoding?: string;
  url?: string;
  raw_url?: string;
  download_url?: string;
  language?: string;
}

export interface CurrentFile extends BaseFile {
  content: string[];
  language?: string;
  raw_url?: string;
  lastModified?: string;
}

// Interfaces para el sistema de archivos
export interface TreeItem {
  name: string;
  path: string;
  type: TreeItemType;
  children?: TreeItem[];
}

export interface FileStats {
  totalSize: number;
  lineCount: number;
  lastModified: string;
  language?: string;
}

export interface DirectoryContents {
  files: RepositoryFile[];
  directories: TreeItem[];
  path: string;
  totalItems: number;
} 