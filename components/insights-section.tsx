"use client";

import { Repository } from "@/types/repository";
import { AlertCircle, GitBranch, GitCommit, Star, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface InsightData {
  stars: number;
  forks: number;
  branches: number;
  commits: number;
  contributors: number;
}

export function InsightsSection({ repository }: { repository: Repository }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (status === "loading") return;

      if (!session?.user?.accessToken) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      if (!repository?.full_name) {
        setError("No repository selected");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [owner, repo] = repository.full_name.split("/");

        // Using the same auth pattern as Issues/PRs
        const headers = {
          Authorization: `Bearer ${session.user.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        };

        // Fetch all data in parallel for better performance
        const [repoResponse, branchesResponse, contributorsResponse] =
          await Promise.all([
            fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
            fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
              headers,
            }),
            fetch(
              `https://api.github.com/repos/${owner}/${repo}/contributors`,
              { headers }
            ),
          ]);

        if (!repoResponse.ok) {
          throw new Error(
            `Failed to fetch repository data: ${repoResponse.statusText}`
          );
        }

        const [repoData, branchesData, contributorsData] = await Promise.all([
          repoResponse.json(),
          branchesResponse.json(),
          contributorsResponse.json(),
        ]);

        setInsights({
          stars: repoData.stargazers_count || 0,
          forks: repoData.forks_count || 0,
          branches: Array.isArray(branchesData) ? branchesData.length : 0,
          commits: repoData.size || 0,
          contributors: Array.isArray(contributorsData)
            ? contributorsData.length
            : 0,
        });
      } catch (err) {
        console.error("Error fetching insights:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch insights"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [repository, session, status]);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <AlertCircle className="h-6 w-6" />
          Cargando Insights...
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
              <div className="flex flex-col gap-2">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-6 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
          <AlertCircle className="h-6 w-6" />
          Error al cargar Insights
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#161b22] rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Repository Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="text-gray-300">Stars</span>
          </div>
          <p className="text-2xl font-bold text-gray-200 mt-2">
            {insights?.stars.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-purple-400" />
            <span className="text-gray-300">Branches</span>
          </div>
          <p className="text-2xl font-bold text-gray-200 mt-2">
            {insights?.branches.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-green-400" />
            <span className="text-gray-300">Commits</span>
          </div>
          <p className="text-2xl font-bold text-gray-200 mt-2">
            {insights?.commits.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span className="text-gray-300">Contributors</span>
          </div>
          <p className="text-2xl font-bold text-gray-200 mt-2">
            {insights?.contributors.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
