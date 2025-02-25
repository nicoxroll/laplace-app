"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRepository } from "@/contexts/repository-context";
import type { Repository } from "@/types/repository";
import { Bot, Github, Gitlab, Loader2, Search } from "lucide-react";

export function RepositoryList() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const { selectedRepo, setSelectedRepo } = useRepository();
  const [width, setWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = e.clientX;
        setWidth(Math.min(Math.max(newWidth, 200), 600));
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  useEffect(() => {
    async function fetchRepositories() {
      if (!session?.user?.accessToken) return;

      try {
        setLoading(true);
        const response = await fetch("https://api.github.com/user/repos", {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch repositories: ${response.statusText}`
          );
        }

        const data = await response.json();
        const transformedData = data.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          private: repo.private,
          provider: "github",
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatar_url,
          },
          default_branch: repo.default_branch,
        }));

        setRepositories(transformedData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch repositories"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchRepositories();
  }, [session]);

  const filteredRepositories = repositories.filter((repo) =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="relative bg-[#161b22] border-r border-[#30363d]"
      style={{
        width: `${width}px`,
        transition: isResizing ? "none" : "width 0.2s ease",
      }}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-500/50"
        onMouseDown={startResizing}
      />

      <div className="h-full flex flex-col">
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center space-x-2 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading repositories...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 m-4 bg-red-500/10 text-red-400 rounded-lg">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              {filteredRepositories.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No repositories found
                </div>
              ) : (
                filteredRepositories.map((repo) => (
                  <button
                    key={`${repo.provider}-${repo.id}`}
                    onClick={() => setSelectedRepo(repo)}
                    className={`w-full p-3 text-left rounded-lg transition-colors group ${
                      selectedRepo?.id === repo.id
                        ? "bg-[#1c2128]"
                        : "hover:bg-[#1c2128]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {repo.provider === "github" ? (
                        <Github className="h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                      ) : (
                        <Gitlab className="h-5 w-5 text-[#fc6d26]" />
                      )}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="w-6 h-6 rounded-full"
                        />
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-sm text-gray-200 font-medium truncate">
                            {repo.full_name}
                          </span>
                          {repo.description && (
                            <span className="text-xs text-gray-400 truncate">
                              {repo.description}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              repo.private
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {repo.private ? "Private" : "Public"}
                          </span>
                          <span className="text-xs text-gray-400">
                            {repo.default_branch}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
