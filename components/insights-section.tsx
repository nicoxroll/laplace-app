"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LineChart, BarChart3, Users, Star, GitFork, Eye, Loader2 } from 'lucide-react';
import type { Repository } from '../types/repository';

interface InsightStats {
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  subscribers_count: number;
  open_issues_count: number;
  network_count: number;
}

interface InsightsSectionProps {
  repository: Repository;
}

export function InsightsSection({ repository }: InsightsSectionProps) {
  const { data: session } = useSession();
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      if (!session?.accessToken || !repository) return;

      setLoading(true);
      setError(null);

      try {
        const baseUrl = repository.provider === 'github'
          ? `https://api.github.com/repos/${repository.full_name}`
          : `https://gitlab.com/api/v4/projects/${repository.id}`;

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': repository.provider === 'github'
              ? 'application/vnd.github+json'
              : 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch repository insights');

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching insights');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, [repository, session]);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-400">Loading insights...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg flex items-center">
          <LineChart className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <LineChart className="h-6 w-6" />
        Repository Insights
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-[#0d1117] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="text-sm text-gray-400">Stars</span>
          </div>
          <span className="text-2xl font-bold text-gray-200">
            {stats?.stargazers_count.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <GitFork className="h-5 w-5 text-blue-400" />
            <span className="text-sm text-gray-400">Forks</span>
          </div>
          <span className="text-2xl font-bold text-gray-200">
            {stats?.forks_count.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-5 w-5 text-green-400" />
            <span className="text-sm text-gray-400">Watchers</span>
          </div>
          <span className="text-2xl font-bold text-gray-200">
            {stats?.watchers_count.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-purple-400" />
            <span className="text-sm text-gray-400">Subscribers</span>
          </div>
          <span className="text-2xl font-bold text-gray-200">
            {stats?.subscribers_count.toLocaleString()}
          </span>
        </div>

        <div className="p-4 bg-[#0d1117] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-red-400" />
            <span className="text-sm text-gray-400">Open Issues</span>
          </div>
          <span className="text-2xl font-bold text-gray-200">
            {stats?.open_issues_count.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
