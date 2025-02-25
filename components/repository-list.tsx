"use client";

import { Resizable } from "@/components/ui/resizable";
import { useRepository } from "@/contexts/repository-context";
import type { Repository } from "@/types/repository";
import { Bot, Github, Gitlab, Loader2, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { RepositoryService } from "@/services/repository-service";

export function RepositoryList() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const { selectedRepo, setSelectedRepo } = useRepository();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const repositoryService = RepositoryService.getInstance();

  useEffect(() => {
    async function fetchRepositories() {
      if (!session) return;

      try {
        setLoading(true);
        const repos = await repositoryService.fetchRepositories(session);
        setRepositories(repos);
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
    <Resizable>
      <div className="w-full h-full bg-[#161b22] border-r border-[#30363d] flex flex-col relative z-20">
        <div className="p-4 border-b border-[#30363d]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-custom">
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
            <div className="space-y-1 p-2">
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
                    <div className="flex items-start gap-3">
                      {repo.provider === "github" ? (
                        <Github className="h-5 w-5 text-gray-400 group-hover:text-gray-300 shrink-0 mt-0.5" />
                      ) : (
                        <Gitlab className="h-5 w-5 text-[#fc6d26] shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0 flex justify-between items-start">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-200 truncate">
                            {repo.name}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {repo.owner.login}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[11px] ${
                              repo.private
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-green-500/20 text-green-400"
                            }`}
                          >
                            {repo.private ? "Private" : "Public"}
                          </span>
                          <span className="text-[11px] text-gray-500">
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
    </Resizable>
  );
}
