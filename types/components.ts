import { Repository } from "./repository";

export interface FloatingChatProps {
  apiUrl: string;
}

export interface CodeViewerProps {
  content: string[];
  fileName: string;
  filePath: string;
  imageSrc?: string;
  githubToken?: string;
}

export interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export interface RepositoryListProps {
  onSelect: (repository: Repository) => void;
  selectedRepo: Repository | null;
}
