"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronUp, File, Folder } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  html_url: string;
  updated_at: string;
}

interface GitHubContent {
  name: string;
  path: string;
  type: "file" | "dir";
  url: string;
  html_url: string;
}

export interface RepositoryListProps {
  onRepoSelect?: (fullName: string) => void;
  onFileSelect?: (content: string[]) => void;
  currentPath?: string;
  onPathChange?: (newPath: string) => void;
  selectedRepo?: string | null;
}

export function RepositoryList({
  onRepoSelect,
  onFileSelect,
  currentPath = "",
  onPathChange,
  selectedRepo,
}: RepositoryListProps) {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contents, setContents] = useState<GitHubContent[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (session?.accessToken && !selectedRepo) {
      fetch("https://api.github.com/user/repos?sort=updated&per_page=50", {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch repositories");
          return res.json();
        })
        .then((data) => {
          setRepositories(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [session, selectedRepo]);

  const fetchRepoContents = async (fullName: string, path: string = "") => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${fullName}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to load contents");
      const data = await response.json();
      setContents(data);
      if (onPathChange) onPathChange(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contents");
    }
  };

  const handleFileClick = async (item: GitHubContent) => {
    if (item.type === "dir") {
      const newPath = item.path;
      setHistory([...history, currentPath]);
      if (onPathChange) onPathChange(newPath);
      fetchRepoContents(selectedRepo!, newPath);
    } else if (onFileSelect) {
      try {
        const response = await fetch(item.url, {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });
        const fileData = await response.json();
        const content = atob(fileData.content).split("\n");
        onFileSelect(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      }
    }
  };

  const handleGoBack = () => {
    const newHistory = [...history];
    const prevPath = newHistory.pop() || "";
    setHistory(newHistory);
    if (onPathChange) onPathChange(prevPath);
    fetchRepoContents(selectedRepo!, prevPath);
  };

  if (selectedRepo) {
    return (
      <div className="space-y-2 px-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (onRepoSelect) onRepoSelect("");
            if (onPathChange) onPathChange("");
            setHistory([]);
          }}
          className="text-gray-300 hover:bg-[#30363d] w-full justify-start"
        >
          <ChevronUp className="h-4 w-4 mr-2" />
          Back to repositories
        </Button>

        {currentPath && (
          <Button
            variant="ghost"
            onClick={handleGoBack}
            className="text-gray-300 hover:bg-[#30363d] w-full justify-start"
          >
            <ChevronUp className="h-4 w-4 mr-2" />
            Up one level
          </Button>
        )}

        {contents.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className="w-full justify-start gap-2 text-sm text-gray-300 hover:bg-[#30363d] py-2"
            onClick={() => handleFileClick(item)}
          >
            {item.type === "dir" ? (
              <Folder className="h-4 w-4" />
            ) : (
              <File className="h-4 w-4" />
            )}
            {item.name}
            {item.type === "dir" && (
              <ChevronRight className="h-4 w-4 ml-auto" />
            )}
          </Button>
        ))}
      </div>
    );
  }

  if (loading) {
    return <div className="p-4 text-gray-400">Loading repositories...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-400">Error: {error}</div>;
  }

  if (repositories.length === 0) {
    return <div className="p-4 text-gray-400">No repositories found</div>;
  }

  return (
    <div className="px-2">
      {repositories.map((repo) => (
        <Button
          key={repo.id}
          variant="ghost"
          className="w-full justify-start gap-2 text-sm text-gray-300 hover:bg-[#30363d] py-6"
          onClick={() => {
            if (onRepoSelect) onRepoSelect(repo.full_name);
            fetchRepoContents(repo.full_name);
          }}
        >
          <Folder className="h-4 w-4 shrink-0" />
          <div className="flex flex-col items-start text-left">
            <span className="font-medium">{repo.name}</span>
            {repo.description && (
              <span className="text-xs text-gray-400 truncate max-w-full">
                {repo.description}
              </span>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
}
