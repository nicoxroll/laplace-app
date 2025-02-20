"use client";
import "/styles/globals.css";

import { ChevronRight, Send, StopCircle } from "lucide-react";
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
import remarkGfm from "remark-gfm";

interface RepoItem {
  name: string;
  type: string;
  path: string;
  content?: string;
  children?: RepoItem[];
}

interface RepoData {
  selectedRepo: string | null;
  currentPath: string;
  fileContent: string[];
  repoStructure: RepoItem[];
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
    if (!repoData.selectedRepo) return "No hay repositorio seleccionado";

    const formatStructure = (structure: RepoItem[]): string => {
      return structure
        .map((item) => {
          if (item.type === "dir") {
            return `📁 ${item.path}\n${formatStructure(item.children || [])}`;
          }
          return `📄 ${item.path} (${item.content?.length || 0} caracteres)`;
        })
        .join("\n");
    };

    return `
${repoData.fileContent.join("\n").slice(0, 2000)}${
      repoData.fileContent.join("\n").length > 2000 ? "..." : ""
    }

 Archivo actual: ${fileName || "Ninguno"}
Ruta completa: ${repoData.currentPath ? `${repoData.currentPath}/` : ""}${
      fileName || ""
    }
Contenido del archivo:
${repoData.fileContent.join("\n").slice(0, 2000)}${
      repoData.fileContent.join("\n").length > 2000 ? "..." : ""
    }

Estructura del repositorio:
${formatStructure(repoData.repoStructure)}
`;
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
      const newMessage = { role: "user", content: input };
      const contextMessage = {
        role: "system",
        content: `Contexto:\n${getRepoContext()}\nInstrucciones: Responde en markdown usando el contexto del repositorio`,
      };

      setMessages((prev) => {
        const filteredMessages = prev.filter((msg) => msg.role !== "system");
        return [...filteredMessages, contextMessage, newMessage];
      });
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
          code({ node, className, children, ...props }) {
            const language = className?.replace("language-", "") || "text";
            return (
              <pre
                className={`language-${language} rounded-lg p-4 my-3 bg-[#1e1e1e]`}
              >
                <code className={`language-${language}`}>
                  {String(children).replace(/\n$/, "")}
                </code>
              </pre>
            );
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
                {msg.role === "assistant" && (
                  <div className="text-xs text-gray-400 mb-2">
                    Contexto: {repoData.selectedRepo}
                  </div>
                )}
                <div className="text-sm">{renderMarkdown(msg.content)}</div>
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
      </div>
    </aside>
  );
}
