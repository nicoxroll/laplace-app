"use client";

import { useRepository } from "@/contexts/repository-context";
import { FileService } from "@/services/file-service";
import { RepositoryService } from "@/services/repository-service";
import type { Branch, Commit } from "@/types/repository";
import {
  Archive,
  BookOpen,
  Check,
  Copy,
  Download,
  GitBranch,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { FileTree } from "./file-tree";

export function CodeViewer() {
  const {
    selectedRepo,
    currentPath,
    fileContent,
    currentFile,
    setFileContent,
    currentBranch,
    setCurrentBranch,
    currentCommit,
    setCurrentCommit,
  } = useRepository();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isCommitsOpen, setIsCommitsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileService = FileService.getInstance();
  const repositoryService = RepositoryService.getInstance();
  const { data: session } = useSession();

  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedRepo || !session?.user?.accessToken) return;

      setIsLoading(true);
      try {
        const branchesData = await repositoryService.fetchBranches(
          selectedRepo,
          session.user.accessToken
        );
        setBranches(branchesData);
        setSelectedBranch(selectedRepo.default_branch);
      } catch (error) {
        console.error("Error fetching branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, [selectedRepo, session]);

  useEffect(() => {
    const fetchCommits = async () => {
      if (!selectedRepo || !session?.user?.accessToken || !selectedBranch)
        return;

      setIsLoading(true);
      try {
        const commitsData = await repositoryService.fetchCommits(
          selectedRepo,
          session.user.accessToken,
          selectedBranch
        );
        setCommits(commitsData);
      } catch (error) {
        console.error("Error fetching commits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [selectedRepo, session, selectedBranch]);

  useEffect(() => {
    const updateContent = async () => {
      if (!selectedRepo || !session?.user?.accessToken || !currentPath) return;

      setIsLoading(true);
      try {
        const ref =
          currentCommit || currentBranch || selectedRepo.default_branch;
        const content = await repositoryService.fetchFileContent(
          selectedRepo,
          session.user.accessToken,
          currentPath,
          ref
        );

        if (content.length > 0) {
          setFileContent(content);
        }
      } catch (error) {
        console.error("Error updating content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    updateContent();
  }, [selectedRepo, currentPath, currentBranch, currentCommit, session]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fileContent.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent.join("\n")], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentPath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getFileSize = () => {
    const bytes = new Blob([fileContent.join("\n")]).size;
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading content...
        </div>
      );
    }

    if (!fileContent || fileContent.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Select a file from the repository to view its contents
        </div>
      );
    }

    try {
      const processedContent = fileService.processFileContent(
        fileContent,
        currentFile?.encoding
      );

      if (currentPath && fileService.isImage(currentPath)) {
        const imageUrl = fileService.getRawUrl(selectedRepo!, currentPath);
        return (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={imageUrl}
              alt={currentPath.split("/").pop() || ""}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );
      }

      if (currentPath?.toLowerCase().endsWith(".md")) {
        return (
          <div className="p-8 prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processedContent}
            </ReactMarkdown>
          </div>
        );
      }

      const language = currentPath?.split(".").pop() || "text";

      return (
        <div className="w-full h-full overflow-y-auto overflow-x-scroll scrollbar-custom">
          <div className="min-w-full inline-block">
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              showLineNumbers
              customStyle={{
                margin: 0,
                background: "#0d1117",
                padding: "1rem",
                minWidth: "100%",
                display: "inline-block",
              }}
              lineNumberStyle={{
                minWidth: "3em",
                paddingRight: "1em",
                color: "#484f58",
                textAlign: "right",
                userSelect: "none",
                borderRight: "1px solid #30363d",
              }}
              wrapLines
              wrapLongLines={false} // Cambiado a false para permitir scroll horizontal
              lineProps={{
                style: { display: "block", whiteSpace: "pre" },
                className: "hover:bg-[#1c2128] px-4 transition-colors",
              }}
            >
              {processedContent}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error rendering content:", error);
      return (
        <div className="flex items-center justify-center h-full text-red-400">
          Error processing file content
        </div>
      );
    }
  };

  // Update branch selection handler
  const handleBranchChange = async (branch: Branch) => {
    setSelectedBranch(branch.name);
    setCurrentBranch(branch.name);
    setCurrentCommit(null); // Reset commit when changing branch
    setIsBranchesOpen(false);
  };

  // Update commit selection handler
  const handleCommitSelect = async (commit: Commit) => {
    setCurrentCommit(commit.sha);
    setIsCommitsOpen(false);
  };

  return (
    <div
      className={`flex flex-col h-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117]" : ""
      }`}
    >
      {/* Repository Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          <BookOpen className="h-5 w-5 text-gray-400" />
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-gray-300">
              {selectedRepo?.owner?.login}
            </span>
            <span className="text-gray-400">/</span>
            <span className="text-sm font-medium text-gray-300">
              {selectedRepo?.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Branch Selector */}
          <div className="relative">
            <button
              onClick={() => setIsBranchesOpen(!isBranchesOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#30363d] border border-[#30363d] text-gray-300"
            >
              <GitBranch className="h-4 w-4" />
              <span className="text-sm">{selectedBranch}</span>
            </button>
            {isBranchesOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg z-10">
                {branches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => handleBranchChange(branch)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-[#30363d] ${
                      selectedBranch === branch.name ? "bg-[#1c2128]" : ""
                    }`}
                  >
                    <span className="text-gray-300">{branch.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Commits History */}
          <div className="relative">
            <button
              onClick={() => setIsCommitsOpen(!isCommitsOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#30363d] border border-[#30363d] text-gray-300"
            >
              <History className="h-4 w-4" />
              <span className="text-sm">History</span>
            </button>

            {isCommitsOpen && (
              <div className="absolute top-full right-0 mt-1 w-96 max-h-[32rem] overflow-y-auto bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg z-10">
                {commits.map((commit) => (
                  <button
                    key={commit.sha}
                    onClick={() => handleCommitSelect(commit)}
                    className="w-full px-4 py-3 text-left border-b border-[#30363d] hover:bg-[#1c2128] last:border-0"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-300 font-medium truncate">
                        {commit.message}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Archive className="h-3 w-3" />
                        <span>{commit.sha.slice(0, 7)}</span>
                        <span>•</span>
                        <span>{commit.author.name}</span>
                        <span>•</span>
                        <span>
                          {new Date(commit.author.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Existing Content */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className={`border-r border-[#30363d] bg-[#0d1117] overflow-hidden transition-all duration-300 ${
            isSidebarOpen ? "w-64" : "w-0"
          }`}
        >
          <div className="h-full overflow-auto scrollbar-custom">
            <FileTree />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {fileContent.length > 0 && (
            <div className="h-[41px] flex items-center justify-between px-4 bg-[#161b22] border-b border-[#30363d]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-1.5 rounded hover:bg-[#30363d] text-gray-400"
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeftOpen className="h-4 w-4" />
                  )}
                </button>

                <span className="text-sm text-gray-300">
                  {currentPath.split("/").pop()}
                </span>
                <span className="text-xs text-gray-500">
                  {fileContent.length} lines ({getFileSize()})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 rounded hover:bg-[#30363d] text-gray-400"
                  title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-[#30363d] text-gray-400"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded hover:bg-[#30363d] text-gray-400"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto scrollbar-custom">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
