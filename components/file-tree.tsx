"use client";

import { useRepository } from "@/contexts/repository-context";
import { FileService } from "@/services/file-service";
import { Octokit } from "@octokit/rest";
import { ArrowLeft, ChevronRight, File, Folder, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface TreeItem {
  name: string;
  path: string;
  type: "file" | "dir";
  content?: string;
}

export function FileTree() {
  const { selectedRepo, setCurrentPath, setFileContent } = useRepository();
  const { data: session } = useSession();
  const [tree, setTree] = useState<TreeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const fileService = FileService.getInstance();

  const fetchContents = async (path: string = "") => {
    if (!session?.user?.accessToken || !selectedRepo) return;

    try {
      setLoading(true);

      if (selectedRepo.provider === "gitlab") {
        const encodedPath = path ? encodeURIComponent(path) : "";
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${selectedRepo.id}/repository/tree?path=${encodedPath}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch GitLab contents");

        const data = await response.json();
        setTree(
          data
            .map(
              (item: any): TreeItem => ({
                name: item.name,
                path: item.path,
                type: item.type === "tree" ? "dir" : "file",
              })
            )
            .sort((a: TreeItem, b: TreeItem) => {
              if (a.type === b.type) return a.name.localeCompare(b.name);
              return a.type === "dir" ? -1 : 1;
            })
        );
      } else {
        // Código existente para GitHub
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
      }

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
      if (fileService.isImage(path)) {
        const imageUrl = fileService.getImageUrl(selectedRepo, path);
        setFileContent([imageUrl]);
        setCurrentPath(path);
        return;
      }

      if (selectedRepo.provider === "gitlab") {
        const encodedPath = encodeURIComponent(path);
        const response = await fetch(
          `https://gitlab.com/api/v4/projects/${selectedRepo.id}/repository/files/${encodedPath}/raw?ref=${selectedRepo.default_branch}`,
          {
            headers: {
              Authorization: `Bearer ${session.user.accessToken}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok)
          throw new Error("Failed to fetch GitLab file content");

        const content = await response.text();
        setFileContent(content.split("\n"));
        setCurrentPath(path);
      } else {
        // Código existente para GitHub
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
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      setFileContent(["Error loading file content"]);
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
      await fetchContents(item.path);
    } else {
      await fetchFileContent(item.path);
    }
  };

  const filteredTree = tree.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      {/* Search bar */}
      <div className="p-2 border-b border-[#30363d]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-gray-300 focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff]"
          />
          <Search className="h-4 w-4 text-gray-500 absolute left-2 top-2" />
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-auto scrollbar-custom">
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
              {filteredTree.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleItemClick(item)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-[#1c2128] rounded-md text-left text-sm group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.type === "dir" ? (
                      <>
                        <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
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
              {filteredTree.length === 0 && searchTerm && (
                <div className="text-center py-4 text-gray-400">
                  No files found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
