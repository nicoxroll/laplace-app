"use client";

import { FileTree } from "@/components/file-tree";
import { useRepository } from "@/contexts/repository-context";
import { FileService } from "@/services/file-service";
import {
  Check,
  Copy,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

export function CodeViewer() {
  const {
    selectedRepo,
    currentPath,
    fileContent,
    currentBranch,
    branches,
    commits,
    isLoading,
    handleBranchChange,
    handleCommitSelect,
  } = useRepository();

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);
  const [isCommitsOpen, setIsCommitsOpen] = useState(false);
  const fileService = FileService.getInstance();

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
      if (currentPath?.toLowerCase().endsWith(".md")) {
        return (
          <div className="p-8 prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {fileContent.join("\n")}
            </ReactMarkdown>
          </div>
        );
      }

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
              wrapLongLines={false}
              lineProps={{
                style: { display: "block", whiteSpace: "pre" },
                className: "hover:bg-[#1c2128] px-4 transition-colors",
              }}
            >
              {fileContent.join("\n")}
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

  return (
    <div
      className={`flex flex-col h-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117]" : ""
      }`}
    >
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

        <div className="flex-1 overflow-auto scrollbar-custom">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
