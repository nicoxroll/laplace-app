"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import type { Repository } from "@/types/repository";

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
  return context;
}
