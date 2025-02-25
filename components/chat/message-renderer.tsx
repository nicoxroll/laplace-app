"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  context?: {
    repository?: {
      full_name: string;
    };
    currentFile?: {
      path: string;
    };
  };
}

export function MessageRenderer({ message }: { message: Message }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === "user"
          ? "bg-[#1f6feb] text-white ml-8"
          : "bg-[#161b22] text-gray-200 mr-8 border border-[#30363d]"
      }`}
    >
      {message.role === "assistant" && message.context && (
        <div className="text-xs text-gray-400 mb-2 flex flex-col gap-1">
          {message.context.repository && (
            <div>Repository: {message.context.repository.full_name}</div>
          )}
          {message.context.currentFile && (
            <div>Current File: {message.context.currentFile.path}</div>
          )}
        </div>
      )}
      <div className="prose prose-invert max-w-none">
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
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        background: "#0d1117",
                        padding: "2rem 1rem 1rem 1rem",
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
      </div>
    </div>
  );
}
