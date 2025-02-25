import { Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function MessageRenderer({ message }: { message: Message }) {
  return (
    <div
      className={`p-4 ${
        message.role === "user" ? "bg-[#1c2128]" : "bg-[#2d333b]"
      } rounded-lg mb-4`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <div className="relative group">
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(String(children))
                  }
                  className="absolute right-2 top-2 p-1 rounded bg-[#1c2128] opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Copy code"
                >
                  <Copy className="h-4 w-4 text-gray-400" />
                </button>
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  className="!bg-[#0d1117] !p-4 rounded-lg border border-[#30363d]"
                  showLineNumbers
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                className="bg-[#1c2128] px-2 py-1 rounded text-sm"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <div className="my-4">{children}</div>;
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
