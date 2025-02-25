// components/issues-section.tsx
"use client";

import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { Octokit } from "@octokit/rest";
import { AlertCircle, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

interface Issue {
  id: number;
  number: number;
  title: string;
  state: string;
  created_at: string;
  html_url: string;
  user: {
    login: string;
    avatar_url: string;
  } | null;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

export function IssuesSection({ repository }: { repository: Repository }) {
  const { data: session, status } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchIssues = useCallback(async () => {
    // Check authentication status
    if (status === "loading") return;

    // Modificamos la verificación de autenticación para incluir el token en user
    if (!session?.user?.accessToken) {
      console.log("Session debug:", session); // Para debugging
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    // Check repository
    if (!repository || !repository.full_name) {
      setError("No repository selected");
      setLoading(false);
      return;
    }

    // Verify provider
    if (repository.provider !== "github") {
      setError("Only GitHub repositories are supported");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const octokit = new Octokit({
        auth: session.user.accessToken, // Usamos el token desde session.user
      });

      const [owner, repo] = repository.full_name.split("/");

      const { data } = await octokit.issues.listForRepo({
        owner,
        repo,
        state: "all",
        per_page: 100,
        sort: "created",
        direction: "desc",
      });

      // Filter out pull requests from issues
      const issuesOnly = data
        .filter((issue) => !issue.pull_request && issue.user !== null)
        .map((issue) => ({
          ...issue,
          labels: issue.labels.map((label) =>
            typeof label === "string"
              ? { name: label, color: "" }
              : { name: label.name || "", color: label.color || "" }
          ),
        }));

      setIssues(issuesOnly as Issue[]);
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch issues from GitHub"
      );
    } finally {
      setLoading(false);
    }
  }, [repository, session, status]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const filteredIssues = issues.filter((issue) =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <SectionCard icon={AlertCircle} title="Cargando Issues...">
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard
        icon={AlertCircle}
        title="Error al cargar Issues"
        className="border-red-500/20"
      >
        <p className="text-red-300 font-mono text-sm">{error}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard icon={AlertCircle} title={`Issues - ${repository.full_name}`}>
      <div className="space-y-4">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar Issues..."
              className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <p className="text-gray-400">No se encontraron issues</p>
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
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b border-[#30363d] hover:bg-[#0d1117]"
                  >
                    <td className="px-4 py-3 text-sm text-gray-300">
                      #{issue.number}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {issue.title}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {issue.user && (
                          <img
                            src={issue.user.avatar_url}
                            alt={issue.user.login}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-gray-300">
                          {issue.user && issue.user.login}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          issue.state === "open"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {issue.state}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {new Date(issue.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
