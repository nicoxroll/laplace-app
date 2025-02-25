"use client";

import { Octokit } from "@octokit/rest";
import { ChevronLeft, Folder, Github } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { AgentsSection } from "./agents-section";
import ChatSidebar from "./chat-sidebar";
import { CodeViewer } from "./code-viewer";
import { Header } from "./header";
import { InsightsSection } from "./insights-section";
import { IssuesSection } from "./issues-section";
import { LoginButton } from "./login-button";
import { PullRequestsSection } from "./pull-request-section";
import { RepositoryList } from "./repository-list";
import SecuritySection from "./security-section";

// Update the RepoItem interface
interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
  url?: string; // Make url optional since directories don't need it
  content?: string;
  children: RepoItem[];
}

// Add this type guard function after the interfaces
const isValidRepoItem = (item: any): item is RepoItem => {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.name === "string" &&
    ["file", "dir", "image"].includes(item.type) &&
    typeof item.path === "string" &&
    Array.isArray(item.children)
  );
};

interface GitHubContent {
  name: string;
  type: string;
  path: string;
  html_url: string;
  download_url?: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_CONCURRENT_REQUESTS = 5;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (
  fn: () => Promise<any>,
  retries = MAX_RETRIES,
  delay = RETRY_DELAY
): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export default function Component() {
  const { data: session, status } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("code");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);
  const [repoStructure, setRepoStructure] = useState<RepoItem[]>([]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const octokit = useCallback((token?: string) => {
    return new Octokit({
      auth: token,
      request: {
        timeout: 10000,
      },
    });
  }, []);

  const fetchRepoStructure = useCallback(
    async (repo?: string, path: string = ""): Promise<RepoItem[]> => {
      const targetRepo = repo || selectedRepo;
      if (!targetRepo || !session?.accessToken) return [];

      try {
        const [owner, repoName] = targetRepo.split("/");
        const github = octokit(session.accessToken);

        const fetchContent = async (contentPath: string) => {
          try {
            const { data } = await fetchWithRetry(() =>
              github.repos.getContent({
                owner,
                repo: repoName,
                path: contentPath,
              })
            );
            return data;
          } catch (error) {
            console.error(`Error fetching ${contentPath}:`, error);
            return null;
          }
        };

        const data = await fetchContent(path);
        if (!data) return [];

        const items = Array.isArray(data) ? data : [data];
        const structure: RepoItem[] = [];

        for (let i = 0; i < items.length; i += MAX_CONCURRENT_REQUESTS) {
          const batch = items.slice(i, i + MAX_CONCURRENT_REQUESTS);
          const batchPromises = batch.map(async (item: GitHubContent) => {
            if (item.type === "file") {
              const fileExtension =
                item.name.split(".").pop()?.toLowerCase() || "";
              const isImage = [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "bmp",
                "webp",
              ].includes(fileExtension);

              if (!isImage && item.download_url) {
                try {
                  const { data: fileContent } = await fetchWithRetry(() =>
                    github.request(
                      "GET /repos/{owner}/{repo}/contents/{path}",
                      {
                        owner,
                        repo: repoName,
                        path: item.path,
                        headers: {
                          Accept: "application/vnd.github.v3.raw",
                        },
                      }
                    )
                  );

                  return {
                    name: item.name,
                    type: "file",
                    path: item.path,
                    url: item.html_url,
                    content: typeof fileContent === "string" ? fileContent : "",
                    children: [],
                  };
                } catch (error) {
                  console.warn(
                    `Failed to fetch content for ${item.path}:`,
                    error
                  );
                  // Return a valid RepoItem even if content fetch fails
                  return {
                    name: item.name,
                    type: "file",
                    path: item.path,
                    url: item.html_url,
                    children: [],
                  };
                }
              }

              // Return image file item
              return {
                name: item.name,
                type: isImage ? "image" : "file",
                path: item.path,
                url: isImage
                  ? `https://raw.githubusercontent.com/${owner}/${repoName}/master/${item.path}`
                  : item.html_url,
                children: [],
              };
            } else if (item.type === "dir") {
              const subDirStructure = await fetchRepoStructure(
                targetRepo,
                item.path
              );
              return {
                name: item.name,
                type: "dir",
                path: item.path,
                children: subDirStructure,
              };
            }
            return null;
          });

          const batchResults = await Promise.all(batchPromises);
          // Update the filter validation in fetchRepoStructure
          const validResults = batchResults.filter(isValidRepoItem);

          structure.push(...(validResults as RepoItem[]));

          if (i + MAX_CONCURRENT_REQUESTS < items.length) {
            await sleep(RETRY_DELAY);
          }
        }

        if (JSON.stringify(structure) !== JSON.stringify(repoStructure)) {
          setRepoStructure(structure);
        }

        return structure;
      } catch (error) {
        console.error("Error fetching repo structure:", error);
        return [];
      }
    },
    [session?.accessToken, selectedRepo, repoStructure, octokit]
  );

  const handleRepoSelect = useCallback(
    async (fullName: string) => {
      setSelectedRepo(fullName);
      setCurrentPath("");
      setNavHistory([]);
      setFileContent([]);
      setImageUrl("");
      await fetchRepoStructure(fullName);
    },
    [fetchRepoStructure]
  );

  const handlePathChange = useCallback(
    async (newPath: string) => {
      if (!selectedRepo) return;
      setNavHistory((prev) => [...prev, currentPath]);
      setCurrentPath(newPath);
      setImageUrl("");
      await fetchRepoStructure(selectedRepo, newPath);
    },
    [selectedRepo, currentPath, fetchRepoStructure]
  );

  useEffect(() => {
    if (selectedRepo) {
      const loadStructure = async () => {
        await fetchRepoStructure(selectedRepo, currentPath);
      };
      loadStructure();
    }
  }, [selectedRepo, currentPath, fetchRepoStructure]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      <RepositoryList
        onSelect={(repo) => handleRepoSelect(repo)}
        selectedRepo={selectedRepo}
      />

      <main className="flex-1 overflow-hidden">
        {!session?.user ? (
          <div className="flex flex-col items-center justify-center h-full">
            <h1 className="text-2xl font-bold mb-4">Welcome to Laplace</h1>
            <p className="mb-4">Please sign in to view your repositories.</p>
            <LoginButton />
          </div>
        ) : (
          <div className="h-full space-y-6 max-w-6xl mx-auto">
            {activeSection === "code" && (
              <>
                {imageUrl ? (
                  <CodeViewer
                    content={[]}
                    imageSrc={imageUrl}
                    fileName={fileName}
                    filePath={currentPath}
                    githubToken={session.accessToken}
                  />
                ) : fileContent.length > 0 ? (
                  <CodeViewer
                    content={fileContent}
                    fileName={fileName}
                    filePath={currentPath}
                  />
                ) : selectedRepo ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Folder className="h-16 w-16 mb-4" />
                    {currentPath ? (
                      <>
                        <p className="text-lg">Browse directories</p>
                        <p className="text-sm mt-2">
                          Select a file to view its content
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg">Repository selected</p>
                        <p className="text-sm mt-2">
                          Navigate through the directory structure
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Github className="h-16 w-16 mb-4" />
                    <p className="text-lg">Select a repository</p>
                    <p className="text-sm mt-2">
                      Choose from your list of repositories to begin
                    </p>
                  </div>
                )}
              </>
            )}
            {activeSection === "pull-requests" && (
              <PullRequestsSection selectedRepo={selectedRepo} />
            )}

            {activeSection === "issues" && (
              <IssuesSection selectedRepo={selectedRepo} />
            )}

            {activeSection === "security" && (
              <SecuritySection
                apiUrl={
                  process.env.NEXT_PUBLIC_API_SEC_URL ||
                  "http://localhost:1234/v1/chat/completions"
                }
                repoData={{
                  selectedRepo,
                  repoStructure,
                }}
              />
            )}

            {activeSection === "insights" && (
              <InsightsSection selectedRepo={selectedRepo} />
            )}

            {activeSection === "agents" && <AgentsSection />}
          </div>
        )}
      </main>

      {/* Chat flotante si es necesario */}
      <FloatingChat
        apiUrl={process.env.NEXT_PUBLIC_API_URL || ""}
        repoData={{
          selectedRepo: selectedRepo || null,
          currentPath,
          fileContent,
          repoStructure,
        }}
        githubToken={session?.accessToken || ""}
      />
    </div>
  );
}
