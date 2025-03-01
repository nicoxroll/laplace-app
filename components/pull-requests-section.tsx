// components/pull-requests-section.tsx
"use client";

import { DataTable } from "@/components/ui/data-table";
import { SectionCard } from "@/components/ui/section-card";
import { Typography } from "@/components/ui/typography";
import type { Repository } from "@/types/repository";
import { AlertCircle, GitPullRequest } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

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

const columns = [
  {
    id: "number",
    label: "Number",
    minWidth: 70,
    format: (value: number) => `#${value}`,
  },
  {
    id: "title",
    label: "Title",
    minWidth: 200,
    format: (value: string, row: PullRequest) => (
      <a
        href={row.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:underline"
      >
        {value}
      </a>
    ),
  },
  {
    id: "user",
    label: "Author",
    minWidth: 130,
    format: (value: PullRequest["user"]) => (
      <div className="flex items-center gap-2">
        <img
          src={value.avatar_url}
          alt={value.login}
          className="w-6 h-6 rounded-full"
        />
        <span className="text-gray-300">{value.login}</span>
      </div>
    ),
  },
  {
    id: "state",
    label: "Status",
    minWidth: 100,
    format: (value: string) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === "open"
            ? "bg-green-500/20 text-green-400"
            : value === "closed"
            ? "bg-red-500/20 text-red-400"
            : "bg-gray-500/20 text-gray-400"
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    id: "created_at",
    label: "Date",
    minWidth: 100,
    format: (value: string) => new Date(value).toLocaleDateString(),
  },
];

export function PullRequestsSection({
  repository,
}: {
  repository: Repository;
}) {
  const { data: session } = useSession();
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPullRequests() {
      if (!session?.user?.accessToken || !repository) return;

      setLoading(true);
      setError(null);

      try {
        const isGithub = repository.provider === "github";
        const baseUrl = isGithub
          ? `https://api.github.com/repos/${repository.full_name}/pulls?state=all`
          : `https://gitlab.com/api/v4/projects/${repository.id}/merge_requests`;

        const response = await fetch(baseUrl, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: isGithub
              ? "application/vnd.github.v3+json"
              : "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch pull requests: ${response.statusText}`
          );
        }

        const data = await response.json();

        // Transform GitLab data to match GitHub format
        const transformedPRs = isGithub
          ? data
          : data.map((pr: any) => ({
              id: pr.id,
              number: pr.iid,
              title: pr.title,
              state: pr.state,
              created_at: pr.created_at,
              html_url: pr.web_url,
              user: {
                login: pr.author.username,
                avatar_url: pr.author.avatar_url,
              },
              base: {
                ref: pr.target_branch,
              },
              head: {
                ref: pr.source_branch,
              },
            }));

        setPullRequests(transformedPRs);
      } catch (err) {
        console.error("Error fetching pull requests:", err);
        setError(
          err instanceof Error ? err.message : "Error fetching pull requests"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchPullRequests();
  }, [repository, session]);

  if (loading) {
    return (
      <SectionCard icon={GitPullRequest} title="Loading Pull Requests...">
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
        title="Error loading PRs"
        className="border-red-500/20"
      >
        <p className="text-red-300 font-mono text-sm">{error}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={GitPullRequest}
      title={`Pull Requests - ${repository.full_name}`}
    >
      <div className="space-y-4">
        {pullRequests.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No pull requests found
          </Typography>
        ) : (
          <DataTable
            columns={columns}
            rows={pullRequests}
            rowsPerPageOptions={[10, 25, 50]}
          />
        )}
      </div>
    </SectionCard>
  );
}
