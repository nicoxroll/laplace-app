// components/issues-section.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { AlertCircle, Search, Loader2 } from 'lucide-react';
import type { Repository } from '../types/repository';

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
  };
}

interface IssuesSectionProps {
  repository: Repository;
}

export function IssuesSection({ repository }: IssuesSectionProps) {
  const { data: session } = useSession();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchIssues() {
      if (!session?.accessToken || !repository) return;

      setLoading(true);
      setError(null);

      try {
        const baseUrl = repository.provider === 'github'
          ? `https://api.github.com/repos/${repository.full_name}/issues`
          : `https://gitlab.com/api/v4/projects/${repository.id}/issues`;

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': repository.provider === 'github'
              ? 'application/vnd.github+json'
              : 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch issues');

        const data = await response.json();
        setIssues(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching issues');
      } finally {
        setLoading(false);
      }
    }

    fetchIssues();
  }, [repository, session]);

  const filteredIssues = issues.filter(issue =>
    issue.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-400">Loading issues...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <AlertCircle className="h-6 w-6" />
        Issues
      </h2>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search issues..."
            className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No issues found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#30363d]">
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Title</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Author</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">State</th>
                  <th className="px-4 py-3 text-left text-sm text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((issue) => (
                  <tr
                    key={issue.id}
                    className="border-b border-[#30363d] hover:bg-[#1c2128]"
                  >
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
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-sm text-gray-300">
                          {issue.user.login}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        issue.state === 'open'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
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
