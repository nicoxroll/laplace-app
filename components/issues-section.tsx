// components/issues-section.tsx
"use client";

import { SectionCard } from "@/components/ui/section-card";
import { DataTable } from "@/components/ui/data-table";
import type { Repository } from "@/types/repository";
import { Octokit } from "@octokit/rest";
import { AlertCircle } from "lucide-react";
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

const columns = [
  { 
    id: 'number', 
    label: 'Number', 
    minWidth: 70,
    format: (value: number) => `#${value}` 
  },
  { 
    id: 'title', 
    label: 'Title', 
    minWidth: 200,
    format: (value: string, row: Issue) => (
      <a
        href={row.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline"
      >
        {value}
      </a>
    )
  },
  { 
    id: 'user', 
    label: 'Author', 
    minWidth: 130,
    format: (value: Issue['user']) => value && (
      <div className="flex items-center gap-2">
        <img
          src={value.avatar_url}
          alt={value.login}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-gray-300">{value.login}</span>
      </div>
    )
  },
  { 
    id: 'state', 
    label: 'Status', 
    minWidth: 100,
    format: (value: string) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === "open"
            ? "bg-green-500/20 text-green-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {value}
      </span>
    )
  },
  { 
    id: 'created_at', 
    label: 'Date', 
    minWidth: 100,
    format: (value: string) => new Date(value).toLocaleDateString()
  },
];

export function IssuesSection({ repository }: { repository: Repository }) {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!session?.user?.accessToken || !repository) {
      setError("Authentication or repository not available");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let fetchedIssues: Issue[] = [];

      if (repository.provider === "github") {
        const octokit = new Octokit({
          auth: session.user.accessToken,
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

        fetchedIssues = data
          .filter((issue) => !issue.pull_request)
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title,
            state: issue.state,
            created_at: issue.created_at,
            html_url: issue.html_url,
            user: issue.user
              ? {
                  login: issue.user.login,
                  avatar_url: issue.user.avatar_url,
                }
              : null,
            labels: issue.labels.map((label) =>
              typeof label === "string"
                ? { name: label, color: "" }
                : { name: label.name || "", color: label.color || "" }
            ),
          }));
      } else if (repository.provider === "gitlab") {
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${repository.id}/issues?scope=all`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`GitLab API error: ${response.statusText}`);
        }

        const data = await response.json();
        fetchedIssues = data.map((issue: any) => ({
          id: issue.id,
          number: issue.iid,
          title: issue.title,
          state: issue.state === "opened" ? "open" : issue.state,
          created_at: issue.created_at,
          html_url: issue.web_url,
          user: issue.author
            ? {
                login: issue.author.username,
                avatar_url: issue.author.avatar_url,
              }
            : null,
          labels: issue.labels.map((label: string) => ({
            name: label,
            color: "gray", // GitLab no proporciona colores por defecto
          })),
        }));
      }

      setIssues(fetchedIssues);
    } catch (err) {
      console.error("Error fetching issues:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  }, [repository, session]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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
        {issues.length === 0 ? (
          <p className="text-gray-400">No se encontraron issues</p>
        ) : (
          <DataTable 
            columns={columns} 
            rows={issues}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </div>
    </SectionCard>
  );
}
