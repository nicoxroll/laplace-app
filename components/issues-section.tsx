// components/issues-section.tsx
"use client";

import { AlertCircle, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Issue {
  id: number;
  title: string;
  user: {
    login: string;
    avatar_url: string;
  };
  state: "open" | "closed";
  created_at: string;
  html_url: string;
  number: number;
}

export function IssuesSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = issue.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesState = stateFilter === "all" || issue.state === stateFilter;
    return matchesSearch && matchesState;
  });

  useEffect(() => {
    const fetchIssues = async () => {
      if (!selectedRepo || !session?.accessToken) return;

      try {
        setLoading(true);
        const [owner, repo] = selectedRepo.split("/");
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues?state=all`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              Accept: "application/vnd.github+json",
            },
          }
        );

        if (!response.ok) throw new Error("Error fetching issues");
        const data = await response.json();
        setIssues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchIssues();
  }, [selectedRepo, session?.accessToken]);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <AlertCircle className="h-6 w-6" />
          Cargando Issues...
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
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <AlertCircle className="h-6 w-6" />
          Error al cargar Issues
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
        <AlertCircle className="h-6 w-6" />
        Issues - {selectedRepo || "Sin repositorio seleccionado"}
      </h2>

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
                        <img
                          src={issue.user.avatar_url}
                          alt={issue.user.login}
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-300">
                          {issue.user.login}
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
    </div>
  );
}
