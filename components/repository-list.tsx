"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronUp, File, Folder, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

const apiCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

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
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const fetchWithCache = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      retries = 3
    ): Promise<any> => {
      const cacheKey = `${url}|${selectedBranch}`;
      const cached = apiCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }

      let attempt = 0;
      while (attempt <= retries) {
        attempt++;
        try {
          const controller = new AbortController();
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          if (response.status === 403) {
            const resetTime = response.headers.get("X-RateLimit-Reset");
            if (resetTime) {
              const waitTime = parseInt(resetTime) * 1000 - Date.now();
              await new Promise((resolve) =>
                setTimeout(resolve, Math.max(waitTime, 0))
              );
              continue;
            }
          }

          if (!response.ok) {
            if (response.status === 404) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
              continue;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          apiCache.set(cacheKey, { data, timestamp: Date.now() });
          return data;
        } catch (error) {
          if (retries <= 0 || (error as Error).name === "AbortError") {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
      throw new Error(`Failed after ${retries} retries`);
    },
    [selectedBranch]
  );

  const fetchRepoContents = useCallback(
    async (fullName: string, path: string = "") => {
      try {
        const encodedPath = path ? encodeURIComponent(path) : "";
        const data = await fetchWithCache(
          `https://api.github.com/repos/${fullName}/contents/${encodedPath}?ref=${selectedBranch}`,
          {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          }
        );

        const filteredData = data.filter(
          (item: GitHubContent) => item.type === "dir" || item.type === "file"
        );

        setContents(filteredData);
        setSelectedItem(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar contenido"
        );
      }
    },
    [selectedBranch, session?.accessToken, fetchWithCache]
  );

  const fetchBranches = useCallback(async () => {
    if (!selectedRepo) return;
    try {
      const data = await fetchWithCache(
        `https://api.github.com/repos/${selectedRepo}/branches`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );
      setBranches(data);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, [selectedRepo, session?.accessToken, fetchWithCache]);

  const retryLoad = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      if (selectedRepo) {
        await fetchRepoContents(selectedRepo, currentPath);
      } else {
        const data = await fetchWithCache(
          "https://api.github.com/user/repos?sort=updated&per_page=100",
          {
            headers: {
              Authorization: `Bearer ${session?.accessToken}`,
            },
          }
        );
        setRepositories(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, currentPath, session, fetchWithCache, fetchRepoContents]);

  useEffect(() => {
    const controller = new AbortController();
    if (session?.accessToken) {
      retryLoad();
    }
    return () => controller.abort();
  }, [retryLoad, session]);

  useEffect(() => {
    if (selectedRepo) {
      fetchBranches();
    }
  }, [selectedRepo, fetchBranches]);

  useEffect(() => {
    if (!selectedRepo) {
      onRepoSelect?.("", "");
      onPathChange?.("");
      setHistory([]);
      setSelectedItem(null);
    }
  }, [selectedRepo, onRepoSelect, onPathChange]);

  const handleGoBack = useCallback(() => {
    const newHistory = [...history];
    const prevPath = newHistory.pop() || "";
    setHistory(newHistory);
    onPathChange?.(prevPath);
    setSelectedItem(null);
  }, [history, onPathChange]);

  const handleFileClick = useCallback(
    async (item: GitHubContent) => {
      setSelectedItem(item.path);
      if (item.type === "dir") {
        const newPath = item.path;
        setHistory((prev) => [...prev, currentPath]);
        onPathChange?.(newPath);
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
            const fileData = await fetchWithCache(item.url, {
              headers: {
                Authorization: `Bearer ${session?.accessToken}`,
              },
            });
            const content = atob(fileData.content).split("\n");
            onFileSelect(content, "", item.name);
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Error al cargar archivo"
          );
        }
      }
    },
    [
      selectedRepo,
      selectedBranch,
      onFileSelect,
      session,
      fetchWithCache,
      currentPath,
      onPathChange,
    ]
  );

  const filteredRepositories = useMemo(
    () =>
      repositories.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [repositories, searchQuery]
  );

  const filteredContents = useMemo(
    () =>
      contents.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [contents, searchQuery]
  );

  const renderError = useMemo(
    () => (
      <div className="p-4 flex flex-col items-center gap-3">
        <div className="text-red-400">{error}</div>
        <Button
          onClick={retryLoad}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Reintentar
        </Button>
      </div>
    ),
    [error, retryLoad]
  );

  if (selectedRepo) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 bg-[#0d1117] z-10 space-y-2 px-2 pb-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                onRepoSelect?.("", "");
                onPathChange?.("");
                setHistory([]);
                setSelectedItem(null);
              }}
              className="text-gray-300 hover:bg-[#30363d] w-full justify-start"
            >
              <ChevronUp className="h-4 w-4 mr-2" />
              Back to repositories
            </Button>

            <div className="relative">
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-500" />
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
                className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-sm text-gray-300 flex-1 truncate"
              >
                {branches.map((branch) => (
                  <option
                    key={branch.name}
                    value={branch.name}
                    className="truncate"
                    title={branch.name}
                  >
                    {branch.name.length > 12
                      ? `${branch.name.substring(0, 12)}...`
                      : branch.name}
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

        <div className="flex-1 overflow-y-auto px-2">
          {error
            ? renderError
            : filteredContents.map((item) => (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={`w-full justify-start gap-2 text-sm py-2 ${
                    selectedItem === item.path
                      ? "bg-blue-500/20 text-blue-400 border-l-4 border-blue-500"
                      : "text-gray-300 hover:bg-[#30363d]"
                  }`}
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
      <div className="sticky top-0 bg-[#0d1117] z-10 px-2 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="w-full pl-9 bg-[#0d1117] border border-[#30363d] rounded px-3 py-1 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="p-4 text-gray-400">Loading repositories...</div>
        )}

        {error ? (
          renderError
        ) : (
          <>
            {filteredRepositories.length === 0 && (
              <div className="p-4 text-gray-400">No repositories found</div>
            )}

            {filteredRepositories.map((repo) => (
              <Button
                key={repo.id}
                variant="ghost"
                className={`w-full justify-start gap-2 text-sm py-6 ${
                  selectedItem === repo.full_name
                    ? "bg-blue-500/20 text-blue-400 border-l-4 border-blue-500"
                    : "text-gray-300 hover:bg-[#30363d]"
                }`}
                onClick={() => {
                  setSelectedItem(repo.full_name);
                  onRepoSelect?.(repo.full_name, repo.default_branch);
                  setSelectedBranch(repo.default_branch);
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
          </>
        )}
      </div>
    </div>
  );
}
