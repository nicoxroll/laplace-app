// components/pull-requests-section.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { GitPullRequest, Search, Loader2, AlertCircle } from 'lucide-react';
import type { Repository } from '../types/repository';

interface PullRequest {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  };
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
}

interface PullRequestsSectionProps {
  repository: Repository;
}

export function PullRequestsSection({ repository }: PullRequestsSectionProps) {
  const { data: session } = useSession();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchPullRequests() {
      if (!session?.user?.accessToken || !repository) return;

      setLoading(true);
      setError(null);

      try {
        const isGithub = repository.provider === 'github';
        const baseUrl = isGithub
          ? `https://api.github.com/repos/${repository.full_name}/pulls?state=all`
          : `https://gitlab.com/api/v4/projects/${repository.id}/merge_requests`;

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Accept': isGithub 
              ? 'application/vnd.github.v3+json'
              : 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch pull requests: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform GitLab data to match GitHub format
        const transformedPRs = isGithub ? data : data.map((pr: any) => ({
          id: pr.id,
          number: pr.iid,
          title: pr.title,
          state: pr.state,
          created_at: pr.created_at,
          html_url: pr.web_url,
          user: {
            login: pr.author.username,
            avatar_url: pr.author.avatar_url
          },
          base: {
            ref: pr.target_branch
          },
          head: {
            ref: pr.source_branch
          }
        }));

        setPullRequests(transformedPRs);
      } catch (err) {
        console.error('Error fetching pull requests:', err);
        setError(err instanceof Error ? err.message : 'Error fetching pull requests');
      } finally {
        setLoading(false);
      }
    }

    fetchPullRequests();
  }, [repository, session]);

  const filteredPRs = pullRequests.filter(pr =>
    pr.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        Pull Requests - {repository.full_name || "Sin repositorio seleccionado"}
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
