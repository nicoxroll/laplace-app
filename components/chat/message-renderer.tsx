"use client";

import { Message } from "@/types/chat";
import { Box, Typography } from "@mui/material";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

export function MessageRenderer({ message }: { message: Message }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 1,
        bgcolor: message.role === "user" ? "#1f6feb" : "#161b22",
        ml: message.role === "user" ? 6 : 0,
        mr: message.role === "assistant" ? 6 : 0,
      }}
    >
      {message.role === "assistant" && message.context && (
        <Box sx={{ mb: 1, fontSize: 12, color: "text.secondary" }}>
          <Box>Repository: {message.context.repository?.full_name}</Box>
          {message.context.currentFile && (
            <Box>Current File: {message.context.currentFile.path}</Box>
          )}
        </Box>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const [copied, setCopied] = useState(false);

            const handleCopy = async (text: string) => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            };

            return !inline && match ? (
              <div className="relative group">
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => handleCopy(String(children))}
                    className="p-1.5 rounded bg-[#2d333b] hover:bg-[#444c56] text-gray-400"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="max-h-[400px] overflow-auto scrollbar-custom">
                  <SyntaxHighlighter
                    language={match[1]}
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
                      borderRight: "1px solid #30363d"
                    }}
                    wrapLines
                    wrapLongLines={false}
                    lineProps={{
                      style: { display: "block", whiteSpace: "pre" },
                      className: "hover:bg-[#1c2128] px-4 transition-colors",
                    }}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <code className="bg-[#2d333b] px-2 py-1 rounded text-gray-200">
                {children}
              </code>
            );
          }
          // ... rest of markdown components
        }}
      >
        {message.content}
      </ReactMarkdown>
    </Box>
  );
}
