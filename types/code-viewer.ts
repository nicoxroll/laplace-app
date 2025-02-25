import type { Repository } from "./repository";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
  children?: FileNode[];
}

export interface CodeViewerProps {
  content?: string[];
  fileName?: string;
  filePath?: string;
  imageSrc?: string;
  githubToken?: string;
  repository?: string;
}
