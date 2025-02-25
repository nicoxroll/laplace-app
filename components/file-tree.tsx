"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  ArrowLeft,
} from "lucide-react";
import { useRepository } from "@/contexts/repository-context";
import { Octokit } from "@octokit/rest";

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
}

export function FileTree() {
  const { data: session } = useSession();
  const { selectedRepo, setCurrentPath, setFileContent } = useRepository();
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>("");

  const fetchContents = async (path: string = "") => {
    if (!session?.user?.accessToken || !selectedRepo) return;

    try {
      setLoading(true);
      const [owner, repo] = selectedRepo.full_name.split("/");
      const octokit = new Octokit({ auth: session.user.accessToken });

      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      const contents = Array.isArray(data) ? data : [data];
      setTree(
        contents.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "dir" ? -1 : 1;
        })
      );
      setCurrentFolder(path);
    } catch (error) {
      console.error("Error fetching contents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFileContent = async (path: string) => {
    if (!session?.user?.accessToken || !selectedRepo) return;

    try {
      const [owner, repo] = selectedRepo.full_name.split("/");
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch file content");

      const content = await response.text();
      setFileContent(content.split("\n"));
      setCurrentPath(path);
    } catch (error) {
      console.error("Error fetching file:", error);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [selectedRepo]);

  const handleBack = () => {
    const parentPath = currentFolder.split("/").slice(0, -1).join("/");
    fetchContents(parentPath);
  };

  const handleItemClick = async (item: TreeItem) => {
    if (item.type === "dir") {
      if (expandedFolders.has(item.path)) {
        setExpandedFolders((prev) => {
          const next = new Set(prev);
          next.delete(item.path);
          return next;
        });
      } else {
        setExpandedFolders((prev) => new Set([...prev, item.path]));
        await fetchContents(item.path);
      }
    } else {
      await fetchFileContent(item.path);
    }
  };

  return (
    <div className="p-2">
      {/* Back button */}
      {currentFolder && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 w-full px-2 py-2 mb-2 hover:bg-[#1c2128] rounded-md text-gray-400 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>
            Back to {currentFolder.split("/").slice(0, -1).pop() || "root"}
          </span>
        </button>
      )}

      {/* Tree items */}
      {loading ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="space-y-0.5">
          {tree.map((item) => (
            <button
              key={item.path}
              onClick={() => handleItemClick(item)}
              className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-[#1c2128] rounded-md text-left text-sm group"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.type === "dir" ? (
                  <>
                    {expandedFolders.has(item.path) ? (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                    )}
                    <Folder className="h-4 w-4 text-gray-400 shrink-0" />
                  </>
                ) : (
                  <>
                    <span className="w-4" />
                    <File className="h-4 w-4 text-gray-400 shrink-0" />
                  </>
                )}
                <span className="text-gray-300 truncate">{item.name}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
