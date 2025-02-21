"use client";

import { ChevronLeft, Folder, Github } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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

interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
  url?: string;
  content?: string;
  children?: RepoItem[];
}

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

  const handleRepoSelect = async (fullName: string) => {
    setSelectedRepo(fullName);
    setCurrentPath("");
    setNavHistory([]);
    setFileContent([]);
    setImageUrl("");
    await fetchRepoStructure(fullName);
  };

  const fetchRepoStructure = async (
    repo?: string,
    path: string = ""
  ): Promise<RepoItem[]> => {
    const targetRepo = repo || selectedRepo;
    if (!targetRepo) return [];

    try {
      const response = await fetch(
        `https://api.github.com/repos/${targetRepo}/contents/${path}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      );

      if (!response.ok) throw new Error("Error al obtener la estructura");
      const data = await response.json();

      const structure = await Promise.all(
        data.map(async (item: any) => {
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

            return {
              name: item.name,
              type: isImage ? "image" : "file",
              path: item.path,
              url: isImage
                ? `https://raw.githubusercontent.com/${targetRepo}/master/${item.path}`
                : item.download_url,
              content: isImage
                ? ""
                : await fetch(item.download_url).then((res) => res.text()),
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
        })
      );

      const filteredStructure = structure.filter(
        (item): item is RepoItem => item !== null
      );
      setRepoStructure(filteredStructure);
      return filteredStructure;
    } catch (error) {
      console.error("Error:", error);
      return [];
    }
  };

  const handlePathChange = async (newPath: string) => {
    if (!selectedRepo) return;
    setNavHistory((prev) => [...prev, currentPath]);
    setCurrentPath(newPath);
    setImageUrl("");
    await fetchRepoStructure(selectedRepo, newPath);
  };

  useEffect(() => {
    if (selectedRepo) {
      const loadStructure = async () => {
        const structure = await fetchRepoStructure(selectedRepo, currentPath);
        setRepoStructure(structure || []);
      };
      loadStructure();
    }
  }, [selectedRepo, currentPath]);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300">
      <Header
        session={session}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="flex">
        {session?.user && (
          <aside
            className={`fixed left-0 top-[6.5rem] h-[calc(100vh-6.5rem)] w-64 transform ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%-3rem)]"
            } transition-transform duration-300 z-40 bg-[#0d1117] border-r border-[#30363d]`}
          >
            <div className="p-4 h-full flex flex-col">
              <button
                onClick={toggleSidebar}
                className={`absolute -right-5 top-1/2 -translate-y-1/2 bg-[#161b22] p-2 rounded-full border border-[#30363d] hover:bg-[#30363d] z-50 ${
                  isSidebarOpen ? "" : "rotate-180"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] pb-4">
                <RepositoryList
                  onRepoSelect={handleRepoSelect}
                  onFileSelect={(content, url, name) => {
                    setFileContent(content);
                    setImageUrl(url);
                    setFileName(name);
                  }}
                  currentPath={currentPath}
                  onPathChange={handlePathChange}
                  selectedRepo={selectedRepo}
                />
              </div>
            </div>
          </aside>
        )}

        <main
          className={`flex-1 p-4 transition-all duration-300 ${
            isSidebarOpen ? "ml-64 pl-6" : "ml-10"
          } ${isChatSidebarOpen ? "mr-64 pr-6" : "mr-10"} mt-8`}
        >
          {!session?.user ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold mb-4">Welcome to LaPlace</h1>
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
                    process.env.API_FLOW_URL ||
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

        {session?.user && (
          <ChatSidebar
            apiUrl={
              process.env.API_URL || "http://localhost:1234/v1/chat/completions"
            }
            isOpen={isChatSidebarOpen}
            onToggle={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
            repoData={{
              selectedRepo,
              currentPath,
              fileContent,
              repoStructure,
            }}
            githubToken={session.accessToken!}
            fileName={fileName}
          />
        )}
      </div>
    </div>
  );
}
