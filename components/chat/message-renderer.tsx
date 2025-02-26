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

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

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
      <Typography
        variant="body2"
        sx={{
          color: "text.primary",
          "& code": {
            p: "2px 6px",
            borderRadius: 1,
            color: "text.primary",
            fontFamily: "monospace",
            textDecoration: "none",  // Agregar esto para quitar el subrayado
          },
          "& pre": {
            textDecoration: "none",  // Agregar esto para quitar el subrayado en bloques de código
          },
          "& a": {
            textDecoration: "none",  // Base sin subrayado
            "&:hover": {
              textDecoration: "underline", // Subrayado solo al hover para links
            }
          }
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const code = String(children).replace(/\n$/, "");
              const match = /language-(\w+)/.exec(className || "");

              return !inline && match ? (
                <div className="relative group">
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={() => handleCopyCode(code)}
                      className="p-1.5 rounded bg-[#2d333b] hover:bg-[#444c56] text-gray-400"
                      title="Copy code"
                    >
                      {copiedCode === code ? (
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
                        borderRight: "1px solid #30363d",
                      }}
                      wrapLines
                      wrapLongLines={false}
                      lineProps={{
                        style: { display: "block", whiteSpace: "pre" },
                        className: "hover:bg-[#1c2128] px-4 transition-colors",
                      }}
                      {...props}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ) : (
                <code
                  className="bg-[#2d333b] px-2 py-1 rounded text-gray-200"
                  style={{ textDecoration: "none" }}  // Agregar esto para código inline
                  {...props}
                >
                  {children}
                </code>
              );
            },
            p: ({ children }) => (
              <p className="text-current mb-4 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside space-y-2 mb-4 pl-4">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside space-y-2 mb-4 pl-4">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-current leading-relaxed">{children}</li>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mb-3 mt-6">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[#30363d] pl-4 italic my-4 text-gray-400">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {message.content}
        </ReactMarkdown>
      </Typography>
    </Box>
  );
}
