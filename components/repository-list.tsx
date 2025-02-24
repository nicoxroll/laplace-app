"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Bot, Github, Gitlab, Loader2, Search } from 'lucide-react';
import type { Repository } from '../types/repository';

interface RepositoryListProps {
  onSelect: (repository: Repository) => void;
  selectedRepo?: Repository | null;
  className?: string;
}

export function RepositoryList({ onSelect, selectedRepo, className }: RepositoryListProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchRepositories() {
      if (!session?.user?.accessToken) return;

      try {
        const provider = session.user.provider;
        const baseUrl = provider === 'github' 
          ? 'https://api.github.com/user/repos'
          : 'https://gitlab.com/api/v4/projects';

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.user.accessToken}`,
            'Accept': provider === 'github' 
              ? 'application/vnd.github+json'
              : 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch repositories: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Transform the data based on provider
        const transformedData = provider === 'github' 
          ? data
          : data.map((repo: any) => ({
              id: repo.id,
              name: repo.name,
              full_name: repo.path_with_namespace,
              description: repo.description,
              private: repo.visibility === 'private',
              provider: 'gitlab',
              owner: {
                login: repo.namespace.name,
                avatar_url: repo.namespace.avatar_url
              },
              default_branch: repo.default_branch
            }));

        setRepositories(transformedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        console.error('Error fetching repositories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRepositories();
  }, [session]);

  const filteredRepositories = repositories.filter(repo =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-400">Loading repositories...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg flex items-center">
          <Bot className="h-5 w-5 mr-2" />
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl ${className}`}>
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search repositories..."
            className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="h-4 w-4 text-gray-500 absolute left-3 top-2.5" />
        </div>

        <div className="space-y-1">
          {filteredRepositories.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              No repositories found
            </div>
          ) : (
            filteredRepositories.map((repo) => (
              <button
                key={`${repo.provider}-${repo.id}`}
                onClick={() => onSelect(repo)}
                className={`w-full p-3 text-left rounded-lg transition-colors group ${
                  selectedRepo?.id === repo.id 
                    ? 'bg-[#1c2128]' 
                    : 'hover:bg-[#1c2128]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {repo.provider === 'github' ? (
                    <Github className="h-5 w-5 text-gray-400 group-hover:text-gray-300" />
                  ) : (
                    <Gitlab className="h-5 w-5 text-[#fc6d26]" />
                  )}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={repo.owner.avatar_url}
                      alt={repo.owner.login}
                      className="w-6 h-6 rounded-full"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="text-sm text-gray-200 font-medium truncate">
                        {repo.full_name}
                      </span>
                      {repo.description && (
                        <span className="text-xs text-gray-400 truncate">
                          {repo.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        repo.private 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {repo.private ? 'Private' : 'Public'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {repo.default_branch}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
