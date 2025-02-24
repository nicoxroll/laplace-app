// components/pull-requests-section.tsx
"use client";

import { Octokit } from "@octokit/rest";
import { GitPullRequest, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

// Add rate limiting constants
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

// Add the retry utility function
const fetchWithRetry = async (
  fn: () => Promise<any>,
  retries = MAX_RETRIES
) => {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && error.status === 500) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(fn, retries - 1);
    }
    throw error;
  }
};

interface PullRequest {
  id: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: "open" | "closed" | "merged";
  created_at: string;
  html_url: string;
  number: number;
}

export function PullRequestsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  const { data: session } = useSession();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  // Create Octokit instance with rate limiting
  const octokit = useCallback(() => {
    return new Octokit({
      auth: session?.accessToken,
      throttle: {
        onRateLimit: (
          retryAfter: number,
          options: any,
          octokit: Octokit,
          retryCount: number
        ): boolean => {
          if (retryCount < 2) {
            console.warn(
              `Rate limit exceeded, retrying after ${retryAfter} seconds`
            );
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (
          retryAfter: number,
          options: any,
          octokit: Octokit,
          retryCount: number
        ): boolean => {
          if (retryCount < 2) return true;
          return false;
        },
      },
    });
  }, [session?.accessToken]);

  const fetchPullRequests = useCallback(async () => {
    if (!selectedRepo || !session?.accessToken) return;

    try {
      setLoading(true);
      setError("");
      const [owner, repo] = selectedRepo.split("/");

      const github = octokit();

      const { data } = await fetchWithRetry(async () => {
        return github.pulls.list({
          owner,
          repo,
          state: "all",
          per_page: 100,
          headers: {
            "If-None-Match": "", // Bypass cache
          },
        });
      });

      setPullRequests(data);
    } catch (err: any) {
      console.error("Error fetching pull requests:", err);
      setError(
        err.status === 403
          ? "Rate limit exceeded. Please wait a few minutes and try again."
          : err.message || "Error desconocido"
      );
    } finally {
      setLoading(false);
    }
  }, [selectedRepo, session?.accessToken, octokit]);

  useEffect(() => {
    // Debounce the fetch to prevent too many requests
    const timeoutId = setTimeout(() => {
      fetchPullRequests();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchPullRequests]);

  const filteredPRs = pullRequests.filter((pr) => {
    const matchesSearch = pr.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || pr.state === stateFilter;
    return matchesSearch && matchesState;
  });

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <GitPullRequest className="h-6 w-6" />
          Cargando Pull Requests...
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
          <GitPullRequest className="h-6 w-6" />
          Error al cargar PRs
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <GitPullRequest className="h-6 w-6" />
        Pull Requests - {selectedRepo || "Sin repositorio seleccionado"}
      </h2>

      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar PRs..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
          <select
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-gray-300"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="open">Abiertos</option>
            <option value="closed">Cerrados</option>
          </select>
        </div>

        {filteredPRs.length === 0 ? (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <p className="text-gray-400">No se encontraron pull requests</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="px-4 py-3 text-left text-sm text-gray-400">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">
                    Autor
                  </th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPRs.map((pr) => (
                  <tr
                    key={pr.id}
                    className="border-b border-[#30363d] hover:bg-[#0d1117]"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      #{pr.number}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={pr.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {pr.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={pr.user.avatar_url}
                          alt={pr.user.login}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-300">{pr.user.login}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          pr.state === "open"
                            ? "bg-green-500/20 text-green-400"
                            : pr.state === "closed"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {pr.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(pr.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
