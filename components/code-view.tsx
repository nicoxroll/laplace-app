"use client";

import { Folder, Github, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { CodeViewer } from "./code-viewer";
import { Header } from "./header";
import { LoginButton } from "./login-button";
import { RepositoryList } from "./repository-list";
import { Input } from "./ui/input";

export default function Component() {
  const { data: session, status } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string[]>([]);
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState("code");

  const handleRepoSelect = (fullName: string) => {
    setSelectedRepo(fullName);
    setCurrentPath("");
    setNavHistory([]);
    setFileContent([]);
  };

  const handlePathChange = (newPath: string) => {
    setNavHistory((prev) => [...prev, currentPath]);
    setCurrentPath(newPath);
  };

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
          <aside className="w-64 border-r border-[#30363d] h-[calc(100vh-8rem)] hidden lg:block">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  className="pl-9 bg-[#0d1117] border-[#30363d] h-8 text-sm"
                  placeholder="Find a repository"
                />
              </div>
            </div>
            <RepositoryList
              onRepoSelect={handleRepoSelect}
              onFileSelect={setFileContent}
              currentPath={currentPath}
              onPathChange={handlePathChange}
              selectedRepo={selectedRepo}
            />
          </aside>
        )}

        <main className="flex-1 p-4">
          {!session?.user ? (
            <div className="flex flex-col items-center justify-center h-full">
              <h1 className="text-2xl font-bold mb-4">
                Welcome to GitHub Clone
              </h1>
              <p className="mb-4">Please sign in to view your repositories.</p>
              <LoginButton />
            </div>
          ) : (
            <div className="h-full">
              {activeSection === "code" && (
                <>
                  {fileContent.length > 0 ? (
                    <CodeViewer content={fileContent} />
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

              {activeSection === "security" && (
                <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
                  <h2 className="text-xl font-bold mb-4">Security Overview</h2>
                  {selectedRepo ? (
                    <div className="space-y-4">
                      <p>Security analysis for: {selectedRepo}</p>
                      <div className="p-4 bg-[#0d1117] rounded">
                        <p>Vulnerability scanning results</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">
                      Select a repository to view security details
                    </p>
                  )}
                </div>
              )}

              {activeSection === "insights" && (
                <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
                  <h2 className="text-xl font-bold mb-4">
                    Repository Insights
                  </h2>
                  {selectedRepo ? (
                    <div className="space-y-4">
                      <p>Analytics for: {selectedRepo}</p>
                      <div className="p-4 bg-[#0d1117] rounded">
                        <p>Commit activity graph</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">
                      Select a repository to view insights
                    </p>
                  )}
                </div>
              )}

              {activeSection === "agents" && (
                <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
                  <h2 className="text-xl font-bold mb-4">AI Agents</h2>
                  {selectedRepo ? (
                    <div className="space-y-4">
                      <p>AI tools for: {selectedRepo}</p>
                      <div className="p-4 bg-[#0d1117] rounded">
                        <p>Code generation assistant</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400">
                      Select a repository to use AI agents
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
