"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FileTree } from "./file-tree";
import { Maximize2, Minimize2, Copy, Check, Download } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useRepository } from "@/contexts/repository-context";

export function CodeViewer() {
  const { data: session } = useSession();
  const { selectedRepo, currentPath, fileContent, setFileContent } =
    useRepository();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div
      className={`flex h-full ${
        isFullscreen ? "fixed inset-0 z-50 bg-[#0d1117]" : ""
      }`}
    >
      {/* File Tree - Always visible */}
      <div className="w-64 border-r border-[#30363d] bg-[#0d1117] overflow-y-auto">
        <FileTree />
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {fileContent.length > 0 ? (
          <>
            {/* File Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
              <div className="flex items-center gap-4">
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

            {/* Code Content */}
            <div className="flex-1 overflow-auto">
              <SyntaxHighlighter
                language={currentPath.split(".").pop() || "text"}
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
                className="!bg-[#0d1117] min-h-full"
                wrapLines
                wrapLongLines
              >
                {fileContent.join("\n")}
              </SyntaxHighlighter>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Select a file from the repository to view its contents
          </div>
        )}
      </div>
    </div>
  );
}
