"use client";

import { useRepository } from "@/contexts/repository-context";
import { FileService } from "@/services/file-service";
import {
  Check,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { FileTree } from "./file-tree";

export function CodeViewer() {
  const { selectedRepo, currentPath, fileContent, currentFile } =
    useRepository();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileService = FileService.getInstance();
  const { data: session } = useSession();

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
    if (!fileContent || fileContent.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Select a file from the repository to view its contents
        </div>
      );
    }

    let processedContent;
    try {
      // Procesar el contenido usando el FileService
      processedContent = fileService.processFileContent(
        fileContent,
        currentFile?.encoding
      );

      // Log para debugging
      console.log("Content processed:", {
        original: fileContent,
        processed: processedContent,
        encoding: currentFile?.encoding,
        provider: selectedRepo?.provider,
      });

      if (currentPath && fileService.isImage(currentPath)) {
        const imageUrl =
          selectedRepo?.provider === "gitlab"
            ? fileService.getRawUrl(selectedRepo, currentPath)
            : `https://raw.githubusercontent.com/${selectedRepo?.full_name}/master/${currentPath}`;

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
        <div className="w-full h-full overflow-auto scrollbar-custom">
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            showLineNumbers
            customStyle={{
              margin: 0,
              background: "#0d1117",
              padding: "1rem",
            }}
            lineNumberStyle={{
              minWidth: "3em",
              paddingRight: "1em",
              color: "#484f58",
              textAlign: "right",
              userSelect: "none",
              borderRight: "1px solid #30363d",
            }}
            className="min-h-full"
            wrapLines
            wrapLongLines
            lineProps={{
              style: { display: "block" },
              className: "hover:bg-[#1c2128] px-4 transition-colors",
            }}
          >
            {processedContent}
          </SyntaxHighlighter>
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
      className={`flex h-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117]" : ""
      }`}
    >
      {/* Sidebar */}
      <div
        className={`border-r border-[#30363d] bg-[#0d1117] overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? "w-64" : "w-0"
        }`}
      >
        <div className="h-full overflow-auto scrollbar-custom">
          <FileTree />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {fileContent.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
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
  );
}
