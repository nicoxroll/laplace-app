"use client";
import { RepositoryContext, RepositoryFile } from "@/types/repository";
import "/styles/globals.css";

import {
  Bot,
  ChevronRight,
  Copy,
  Maximize2,
  Minimize2,
  Send,
  StopCircle,
  X,
} from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism-okaidia.css";
import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import remarkGfm from "remark-gfm";
import { useChat } from "@/contexts/chat-context";
import { useRepository } from "@/contexts/repository-context";

interface RepoItem {
  name: string;
  type: string;
  path: string;
  content?: string;
  children?: RepoItem[];
}

interface FileNode {
  name: string;
  type: string;
  path: string;
  content?: string;
  children?: FileNode[];
}

interface RepoData {
  selectedRepo: string | null;
  currentPath: string;
  fileContent: string[];
  repoStructure: FileNode[];
  currentFile: {
    name: string;
    content: string[];
    path: string;
  };
}

interface ChatSidebarProps {
  apiUrl: string;
  isOpen: boolean;
  onToggle: () => void;
  repoData: RepoData;
  githubToken: string;
  fileName?: string;
}

export default function ChatSidebar({
  apiUrl,
  isOpen,
  onToggle,
  repoData,
  githubToken,
  fileName,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const getRepoContext = useCallback(() => {
    const formatStructure = (items: RepoItem[]): string => {
      console.log("Processing items:", items); // Debug log
      return items
        .map((item) => {
          if (item.type === "dir") {
            return `📁 ${item.path}\n${formatStructure(item.children || [])}`;
          }
          // Log del contenido del archivo
          console.log(
            `File content for ${item.path}:`,
            item.content?.slice(0, 100) + "..."
          );
          return `📄 ${item.path}\n\`\`\`${item.path.split(".").pop()}\n${
            item.content || ""
          }\n\`\`\``;
        })
        .join("\n");
    };

    const context = [];

    // Debug logs para la información del repositorio
    console.log("Repository Data:", {
      selectedRepo: repoData.selectedRepo,
      currentPath: repoData.currentPath,
      fileName: fileName,
      hasFileContent: repoData.fileContent.length > 0,
      structureSize: repoData.repoStructure.length,
    });

    if (repoData.selectedRepo) {
      context.push(`# Repository Analysis Context\n`);
      context.push(`Repository: ${repoData.selectedRepo}`);

      if (fileName && repoData.fileContent.length > 0) {
        context.push(`\n## Current File: ${fileName}`);
        context.push(
          `\`\`\`${fileName.split(".").pop()}\n${repoData.fileContent.join(
            "\n"
          )}\n\`\`\``
        );
      }

      context.push("\n## Repository Structure and Contents:");
      const structureContent = formatStructure(repoData.repoStructure);
      context.push(structureContent);
    }

    const finalContext = context.join("\n");
    // Log del contexto final
    console.log("Final Context being sent:", finalContext);

    return finalContext;
  }, [repoData, fileName]);

  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);

  const startResizing = (e: ReactMouseEvent) => {
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, 200), 800));
    }
  };

  const stopResizing = () => {
    setIsResizing(false);
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const controller = new AbortController();
    setAbortController(controller);

    try {
      setLoading(true);
      const contextMessage = {
        role: "system",
        content: `You are an AI assistant analyzing this specific repository codebase.
Use ONLY the provided repository content as context for your answers.

Repository Context:
${getRepoContext()}

Instructions:
- Base your answers ONLY on the actual repository content provided above
- When referencing code, use the exact file paths from the repository
- Format code examples with proper syntax highlighting
- Reference specific files and line numbers when relevant
- Keep suggestions consistent with the existing codebase patterns
- Use markdown with syntax highlighting for code blocks

Format code examples as:
\`\`\`language
// filepath: /actual/repo/path/file.ext
code
\`\`\``,
      };

      // Log del mensaje completo que se enviará
      console.log("Sending message to API:", {
        systemMessage: contextMessage,
        userMessage: input,
      });

      const newMessage = { role: "user", content: input };

      setMessages((prev) => [...prev, newMessage]);
      setInput("");

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${githubToken}`,
        },
        body: JSON.stringify({
          model: "deepseek-r1-distill-qwen-7b",
          messages: [contextMessage, newMessage],
          temperature: 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (!reader)
        throw new Error("No se pudo obtener el lector de la respuesta");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices[0].delta?.content) {
                assistantMessage += data.choices[0].delta.content;
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === "assistant") {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, content: assistantMessage },
                    ];
                  }
                  return [
                    ...prev,
                    { role: "assistant", content: assistantMessage },
                  ];
                });
              }
            } catch (err) {
              console.error("Error parsing chunk:", err);
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error:", error);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Error al obtener respuesta" },
        ]);
      }
    } finally {
      setLoading(false);
      setAbortController(null);
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setAbortController(null);
    }
  };

  const renderMarkdown = useCallback(
    (content: string) => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "text";

            return !inline ? (
              <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                className="rounded-lg !bg-[#0d1117] !p-4 my-3"
                showLineNumbers={true}
                wrapLines={true}
                {...props}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
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
            return <div className="not-prose my-4">{children}</div>;
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-semibold text-blue-300 my-4">
                {children}
              </h2>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-6 space-y-2 my-3">{children}</ul>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-400 my-4">
                {children}
              </blockquote>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-blue-400 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            );
          },
          em({ children }) {
            return <em className="text-gray-400 italic">{children}</em>;
          },
          strong({ children }) {
            return (
              <strong className="text-gray-300 font-semibold">
                {children}
              </strong>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto">
                <table className="w-full my-4">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-gray-600 px-4 py-2 text-left">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-gray-600 px-4 py-2">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    []
  );

  return (
    <aside
      ref={sidebarRef}
      className={`fixed right-0 top-[6.5rem] h-[calc(100vh-6.5rem)] transform ${
        isOpen ? "translate-x-0" : "translate-x-[calc(100%-2rem)]"
      } transition-transform duration-300 z-40 bg-[#0d1117] border-l border-[#30363d]`}
      style={{
        width: `${width}px`,
        transition: isResizing ? "none" : "width 0.2s ease",
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-gray-500 z-50"
        onMouseDown={startResizing}
        data-testid="resize-handle"
      />

      <div className="p-3 h-full flex flex-col relative">
        <button
          onClick={onToggle}
          className={`absolute -left-3 top-1/2 -translate-y-1/2 bg-[#161b22] p-1.5 rounded-full border border-[#30363d] hover:bg-[#30363d] z-50 ${
            isOpen ? "" : "rotate-180"
          }`}
        >
          <ChevronRight className="h-4 w-4 text-[#c9d1d9]" />
        </button>

        <div className="space-y-4 mb-4">
          <div className="repo-header">
            {repoData.selectedRepo && (
              <div className="repo-info">
                <div className="text-xs text-gray-400 mb-1">
                  Repositorio activo:
                </div>
                <div className="text-sm font-mono text-gray-300 truncate">
                  {repoData.selectedRepo}
                  {repoData.currentPath && `:${repoData.currentPath}`}
                  {"/"}
                  {fileName}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] pb-3"
        >
          {messages
            .filter((msg) => msg.role !== "system") // Ocultar mensajes de sistema
            .map((msg, i) => (
              <div
                key={i}
                className={`p-3 mb-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[#1f6feb] ml-6"
                    : "bg-[#161b22] mr-6"
                }`}
              >
                <div className="text-sm prose prose-invert max-w-none">
                  {msg.role === "assistant" && context && (
                    <div className="text-xs text-gray-400 mb-2 flex flex-col gap-1">
                      <div>Repository: {context.repository?.full_name}</div>
                      {context.currentFile && (
                        <div>Current File: {context.currentFile.path}</div>
                      )}
                    </div>
                  )}
                  {renderMarkdown(msg.content)}
                </div>
              </div>
            ))}
        </div>

        <form onSubmit={handleSubmit} className="relative mt-3">
          {loading ? (
            <div className="w-full pl-3 pr-8 py-2 bg-[#0d1117] rounded-lg text-sm text-[#8b949e] flex items-center my-2 mx-1">
              <div className="dot-flashing mr-2"></div>{" "}
            </div>
          ) : (
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full pl-3 pr-8 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#c9d1d9] focus:ring-2 focus:ring-[#1f6feb] focus:outline-none"
              placeholder="Escribe tu pregunta..."
              disabled={loading}
            />
          )}
          <button
            type="button"
            onClick={loading ? handleStop : handleSubmit}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#58a6ff] disabled:opacity-50"
            disabled={!input.trim() && !loading}
          >
            {loading ? (
              <StopCircle className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Añade este botón temporalmente en el componente para inspeccionar el contexto */}
        <button
          onClick={() => console.log("Current Context:", getRepoContext())}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-blue-500 text-white rounded"
        >
          Debug Context
        </button>
      </div>
    </aside>
  );
}

import { ChatService } from "@/services/chat-service";
import { ChatProps, ChatState } from "@/types/chat";

interface FloatingChatProps {
  apiUrl: string;
  repoData: RepoData;
  githubToken: string;
  fileName: string;
}

import { MessageRenderer } from "./chat/message-renderer";

export function FloatingChat() {
  const { state, dispatch } = useChat();
  const { selectedRepo, currentPath, fileContent } = useRepository();
  const [input, setInput] = useState("");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [state.messages]);

  const getRepoContext = () => {
    if (!selectedRepo) return "";

    const sections = [
      `# Repository Context`,
      `Repository: ${selectedRepo.full_name}`,
      `Current Path: ${currentPath}`,
    ];

    if (fileContent.length > 0) {
      sections.push(
        `\n## Current File Content:`,
        "```",
        fileContent.join("\n"),
        "```"
      );
    }

    return sections.join("\n");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.loading) return;

    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const controller = new AbortController();
      setAbortController(controller);

      // Add user message
      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "user", content: input },
      });

      // Add initial assistant message
      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "assistant", content: "" },
      });

      setInput("");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: getRepoContext() },
              { role: "user", content: input },
            ],
            stream: true,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) throw new Error("Failed to fetch response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.choices?.[0]?.delta?.content) {
                  accumulatedContent += data.choices[0].delta.content;
                  dispatch({
                    type: "UPDATE_LAST_MESSAGE",
                    payload: accumulatedContent,
                  });
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Chat error:", err);
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setAbortController(null);
    }
  };

  return (
    <>
      <button
        onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
        className="fixed bottom-4 right-4 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-50"
      >
        <Bot className="h-6 w-6" />
      </button>

      {state.isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 ${
            state.isExpanded ? "w-[800px] h-[600px]" : "w-[380px] h-[500px]"
          }`}
        >
          <div className="flex flex-col h-full bg-[#0d1117] rounded-lg border border-[#30363d] shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
              <h2 className="text-sm font-medium text-gray-200">
                Repository Chat
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => dispatch({ type: "TOGGLE_EXPAND" })}
                  className="p-1 text-gray-400 hover:text-gray-300"
                >
                  {state.isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
                  className="p-1 text-gray-400 hover:text-gray-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {state.messages.length === 0 ? (
                <div className="text-center text-gray-400">
                  Start a conversation about the repository
                </div>
              ) : (
                state.messages.map((msg, i) => (
                  <MessageRenderer key={i} message={msg} />
                ))
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-[#30363d]"
            >
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about the repository..."
                  className="w-full p-2 pr-24 bg-[#161b22] text-gray-200 rounded-lg border border-[#30363d] focus:outline-none focus:border-blue-500"
                  disabled={state.loading}
                />
                <div className="absolute right-2 top-2 flex items-center gap-2">
                  {state.loading && (
                    <button
                      type="button"
                      onClick={() => abortController?.abort()}
                      className="p-1 text-gray-400 hover:text-gray-300"
                    >
                      <StopCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={state.loading || !input.trim()}
                    className="p-1 text-gray-400 hover:text-gray-300 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
