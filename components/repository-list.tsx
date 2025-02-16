"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronUp, File, Folder, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  default_branch: string;
}

interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  url: string;
  html_url: string;
}

interface Branch {
  name: string;
  protected: boolean;
}

export interface RepositoryListProps {
  onRepoSelect?: (fullName: string, branch: string) => void;
  onFileSelect?: (
    content: string[],
    imageUrl: string,
    fileName: string
  ) => void;
  currentPath?: string;
  onPathChange?: (newPath: string) => void;
  selectedRepo?: string | null;
  defaultBranch?: string;
}

export function RepositoryList({
  onRepoSelect,
  onFileSelect,
  currentPath = "",
  onPathChange,
  selectedRepo,
  defaultBranch = "main",
}: RepositoryListProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (session?.accessToken && !selectedRepo) {
      fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch repositories");
          return res.json();
        })
        .then((data: Repository[]) => {
          setRepositories(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [session, selectedRepo]);

  useEffect(() => {
    if (selectedRepo) {
      fetch(`https://api.github.com/repos/${selectedRepo}/branches`, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
        .then((res) => res.json())
        .then((data: Branch[]) => setBranches(data))
        .catch(console.error);
    }
  }, [selectedRepo, session?.accessToken]);

  const fetchRepoContents = async (fullName: string, path: string = "") => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/contents/${path}?ref=${selectedBranch}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load contents");
      const data = await response.json();
      setContents(data);
      onPathChange?.(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contents");
    }
  };

  const handleFileClick = async (item: GitHubContent) => {
    if (item.type === "dir") {
      const newPath = item.path;
      setHistory([...history, currentPath]);
      onPathChange?.(newPath);
      fetchRepoContents(selectedRepo!, newPath);
    } else if (onFileSelect) {
      try {
        const isImage = [".jpg", ".jpeg", ".png", ".gif"].some((ext) =>
          item.name.toLowerCase().endsWith(ext)
        );

        if (isImage) {
          const imageUrl = `https://raw.githubusercontent.com/${selectedRepo}/${selectedBranch}/${encodeURIComponent(
            item.path
          )}`;
          onFileSelect([], imageUrl, item.name);
        } else {
          const response = await fetch(item.url, {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          });
          const fileData = await response.json();
          const content = atob(fileData.content).split("\n");
          onFileSelect(content, "", item.name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      }
    }
  };

  const handleGoBack = () => {
    const newHistory = [...history];
    const prevPath = newHistory.pop() || "";
    setHistory(newHistory);
    onPathChange?.(prevPath);
    fetchRepoContents(selectedRepo!, prevPath);
  };

  const filteredRepositories = repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContents = contents.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedRepo) {
    return (
      <div className="flex flex-col h-full">
        {/* Header fijo */}
        <div className="sticky top-0 bg-[#0d1117] z-10 space-y-2 px-2 pb-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onRepoSelect?.("", "");
                onPathChange?.("");
                setHistory([]);
              }}
              className="text-gray-300 hover:bg-[#30363d] w-full justify-start"
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Back to repositories
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search files..."
                className="w-full pl-9 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-400">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  fetchRepoContents(selectedRepo, currentPath);
                }}
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-gray-300 flex-1"
              >
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {currentPath && (
              <Button
                variant="ghost"
                onClick={handleGoBack}
                className="text-gray-300 hover:bg-[#30363d] w-full justify-start"
              >
                <ChevronUp className="h-4 w-4 mr-2" />
                Up one level
              </Button>
            )}
          </div>
        </div>

        {/* Lista de archivos con scroll */}
        <div className="flex-1 overflow-y-auto px-2">
          {filteredContents.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className="w-full justify-start gap-2 text-sm text-gray-300 hover:bg-[#30363d] py-2"
              onClick={() => handleFileClick(item)}
            >
              {item.type === "dir" ? (
                <Folder className="h-4 w-4" />
              ) : (
                <File className="h-4 w-4" />
              )}
              {item.name}
              {item.type === "dir" && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Buscador fijo */}
      <div className="sticky top-0 bg-[#0d1117] z-10 px-2 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="w-full pl-9 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de repositorios con scroll */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="p-4 text-gray-400">Loading repositories...</div>
        )}

        {error && <div className="p-4 text-red-400">Error: {error}</div>}

        {!loading && !error && filteredRepositories.length === 0 && (
          <div className="p-4 text-gray-400">No repositories found</div>
        )}

        {filteredRepositories.map((repo) => (
          <Button
            key={repo.id}
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-gray-300 hover:bg-[#30363d] py-6"
            onClick={() => {
              onRepoSelect?.(repo.full_name, repo.default_branch);
              setSelectedBranch(repo.default_branch);
              fetchRepoContents(repo.full_name);
            }}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <div className="flex flex-col items-start text-left">
              <span className="font-medium">{repo.name}</span>
              {repo.description && (
                <span className="text-xs text-gray-400 truncate max-w-full">
                  {repo.description}
                </span>
              )}
              <span className="text-xs text-gray-500 mt-1">
                Default branch: {repo.default_branch}
              </span>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
