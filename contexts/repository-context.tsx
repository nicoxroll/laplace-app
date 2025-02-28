"use client";

import { RepositoryService } from "@/services/repository-service";
import { Branch, Commit, Repository, TreeItem } from "@/types/repository";
import { useSession } from "next-auth/react";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface RepositoryContextType {
  // Repository state
  selectedRepo: Repository | null;
  currentPath: string;
  fileContent: string[];
  currentBranch: string;
  currentCommit: string | null;
  branches: Branch[];
  commits: Commit[];
  isLoading: boolean;
  tree: TreeItem[];
  currentFolder: string;
  searchTerm: string;
  isTreeLoading: boolean;
  currentFile: {
    path: string;
    content: string[];
    language?: string;
    encoding?: string;
  } | null;

  // Actions
  setSelectedRepo: (repo: Repository | null) => void;
  setCurrentPath: (path: string) => void;
  setFileContent: (content: string[]) => void;
  setCurrentBranch: (branch: string) => void;
  setCurrentCommit: (commit: string | null) => void;
  fetchBranches: () => Promise<void>;
  fetchCommits: (branch: string) => Promise<void>;
  fetchFileContent: (path: string, ref?: string) => Promise<void>;
  handleBranchChange: (branch: Branch) => Promise<void>;
  handleCommitSelect: (commit: Commit) => Promise<void>;
  resetContext: () => void;
  setSearchTerm: (term: string) => void;
  fetchTreeContents: (path?: string) => Promise<void>;
  handleTreeItemClick: (item: TreeItem) => Promise<void>;
  handleTreeBack: () => void;
}

const RepositoryContext = createContext<RepositoryContextType | undefined>(
  undefined
);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // States
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [currentBranch, setCurrentBranch] = useState("");
  const [currentCommit, setCurrentCommit] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isTreeLoading, setIsTreeLoading] = useState(false);
  const [currentFile, setCurrentFile] = useState<{
    path: string;
    content: string[];
    language?: string;
    encoding?: string;
  } | null>(null);

  const { data: session } = useSession();
  const repositoryService = RepositoryService.getInstance();

  const resetContext = useCallback(() => {
    setCurrentPath("");
    setFileContent([]);
    setCurrentBranch("");
    setCurrentCommit(null);
    setBranches([]);
    setCommits([]);
  }, []);

  // Actions
  const fetchBranches = async () => {
    if (!selectedRepo || !session?.user?.accessToken) return;

    setIsLoading(true);
    try {
      const branchesData = await repositoryService.fetchBranches(
        selectedRepo,
        session.user.accessToken
      );
      setBranches(branchesData);
      if (!currentBranch && branchesData.length > 0) {
        setCurrentBranch(selectedRepo.default_branch);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCommits = async (branch: string) => {
    if (!selectedRepo || !session?.user?.accessToken) return;

    setIsLoading(true);
    try {
      const commitsData = await repositoryService.fetchCommits(
        selectedRepo,
        session.user.accessToken,
        branch
      );
      setCommits(commitsData);
    } catch (error) {
      console.error("Error fetching commits:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFileContent = useCallback(async (path: string, ref?: string) => {
    if (!selectedRepo || !session?.user?.accessToken) return;

    setIsLoading(true);
    try {
      const fileRef = ref || currentCommit || currentBranch || selectedRepo.default_branch;
      const content = await repositoryService.fetchFileContent(
        selectedRepo,
        session.user.accessToken,
        path,
        fileRef
      );

      if (content.length > 0) {
        setFileContent(content);
        setCurrentPath(path);
        setCurrentFile({
          path,
          content,
          encoding: "utf-8"
        });
      }
    } catch (error) {
      console.error("Error fetching file content:", error);
      setFileContent([]);
      setCurrentFile(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepo, session?.user?.accessToken, currentCommit, currentBranch, repositoryService]);

  const fetchTreeContents = async (path: string = "") => {
    if (!session?.user?.accessToken || !selectedRepo) return;

    try {
      setIsTreeLoading(true);
      const ref = currentCommit || currentBranch || selectedRepo.default_branch;

      if (selectedRepo.provider === "gitlab") {
        const encodedPath = path ? encodeURIComponent(path) : "";
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${selectedRepo.id}/repository/tree?path=${encodedPath}&ref=${ref}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch GitLab contents");

        const data = await response.json();
        setTree(
          data.map(
            (item: any): TreeItem => ({
              name: item.name,
              path: item.path,
              type: item.type === "tree" ? "dir" : "file",
            })
          )
        );
      } else {
        const [owner, repo] = selectedRepo.full_name.split("/");
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch GitHub contents");

        const data = await response.json();
        const contents = Array.isArray(data) ? data : [data];
        setTree(
          contents.map(
            (item: any): TreeItem => ({
              name: item.name,
              path: item.path,
              type: item.type === "dir" ? "dir" : "file",
            })
          )
        );
      }

      setCurrentFolder(path);
    } catch (error) {
      console.error("Error fetching contents:", error);
      setTree([]);
    } finally {
      setIsTreeLoading(false);
    }
  };

  const handleBranchChange = async (branch: Branch) => {
    setCurrentBranch(branch.name);
    setCurrentCommit(null);
    if (currentPath) {
      await fetchFileContent(currentPath, branch.name);
    }
    await fetchCommits(branch.name);
  };

  const handleCommitSelect = async (commit: Commit) => {
    setCurrentCommit(commit.sha);
    if (currentPath) {
      await fetchFileContent(currentPath, commit.sha);
    }
  };

  const handleTreeItemClick = useCallback(async (item: TreeItem) => {
    if (item.type === "dir") {
      await fetchTreeContents(item.path);
    } else if (item.path !== currentPath) {
      await fetchFileContent(item.path);
    }
  }, [currentPath, fetchFileContent, fetchTreeContents]);

  const handleTreeBack = () => {
    const parentPath = currentFolder.split("/").slice(0, -1).join("/");
    fetchTreeContents(parentPath);
  };

  // Effect for initial branches fetch when repo changes
  useEffect(() => {
    if (selectedRepo) {
      resetContext();
      fetchBranches();
    }
  }, [selectedRepo, resetContext]);

  // Effect for fetching commits when branch changes
  useEffect(() => {
    if (currentBranch && selectedRepo) {
      fetchCommits(currentBranch);
    }
  }, [currentBranch, selectedRepo]);

  // Reset tree when repository changes
  useEffect(() => {
    if (selectedRepo) {
      setTree([]);
      setCurrentFolder("");
      setSearchTerm("");
      fetchTreeContents();
    }
  }, [selectedRepo]);

  // Update tree when branch or commit changes
  useEffect(() => {
    const ref = currentCommit || currentBranch;
    if (selectedRepo && ref && currentFolder !== undefined) {
      fetchTreeContents(currentFolder);
    }
  }, [currentBranch, currentCommit, selectedRepo, currentFolder]);

  return (
    <RepositoryContext.Provider
      value={{
        selectedRepo,
        currentPath,
        fileContent,
        currentBranch,
        currentCommit,
        branches,
        commits,
        isLoading,
        tree,
        currentFolder,
        searchTerm,
        isTreeLoading,
        currentFile,
        setSelectedRepo,
        setCurrentPath,
        setFileContent,
        setCurrentBranch,
        setCurrentCommit,
        fetchBranches,
        fetchCommits,
        fetchFileContent,
        handleBranchChange,
        handleCommitSelect,
        resetContext,
        setSearchTerm,
        fetchTreeContents,
        handleTreeItemClick,
        handleTreeBack,
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
