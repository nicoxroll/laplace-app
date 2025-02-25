import type { Repository } from "./repository";

interface RepoItem {
  name: string;
  type: "file" | "folder";
  children?: RepoItem[];
}

interface RepoData {
  selectedRepo: string | null;
  currentPath: string;
  fileContent: string[];
  repoStructure: RepoItem[];
  currentFile?: {
    name: string;
    content: string[];
    path: string;
  };
}

interface FloatingChatProps {
  apiUrl: string;
  repoData: RepoData;
  githubToken: string;
  fileName: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  context?: {
    repository?: Repository;
    currentFile?: {
      path: string;
    };
  };
}

export interface ChatState {
  isOpen: boolean;
  isExpanded: boolean;
  messages: Message[];
  loading: boolean;
}

export interface ChatResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

export interface ChatProps {
  apiUrl: string;
  githubToken?: string;
}
