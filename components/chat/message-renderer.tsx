"use client";

import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function MessageRenderer({ message }: { message: Message }) {
  return (
    <div
      className={`p-4 rounded-lg ${
        message.role === "user"
          ? "bg-blue-600 text-white ml-8"
          : "bg-blue-400/10 text-gray-100 mr-8 border border-blue-400/20"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <div className="relative group">
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                  className="!bg-[#1a1d21] !p-4 rounded-lg my-2"
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className="bg-[#1a1d21] px-2 py-1 rounded text-gray-100"
                {...props}
              >
                {children}
              </code>
            );
          },
          p: ({ children }) => <p className="text-current mb-4">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 mb-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="text-current">{children}</li>,
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
  );
}
