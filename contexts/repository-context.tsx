"use client";

import type { Repository, RepositoryFile } from "@/types/repository";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface RepositoryContextType {
  selectedRepo: Repository | null;
  setSelectedRepo: (repo: Repository | null) => void;
  currentPath: string;
  setCurrentPath: (path: string) => void;
  fileContent: string[];
  setFileContent: (content: string[]) => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(
  undefined
);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string[]>([]);

  return (
    <RepositoryContext.Provider
      value={{
        selectedRepo,
        setSelectedRepo,
        currentPath,
        setCurrentPath,
        fileContent,
        setFileContent,
      }}
    >
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository() {
  const context = useContext(RepositoryContext);
  if (!context) {
    throw new Error("useRepository must be used within a RepositoryProvider");
  }

  const setCurrentFile = useCallback(
    async (file: RepositoryFile) => {
      if (!context) return;

      setState({
        ...context,
        currentPath: file.path,
        currentFile: {
          path: file.path,
          content: file.content?.split("\n") || [],
          language: file.path.split(".").pop(),
          type: file.type,
          raw_url: file.raw_url,
        },
      });
    },
    [context]
  );

  return context;
}
