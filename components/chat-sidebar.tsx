"use client";

import { ChevronRight, Send } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-css.min.js";
import "prismjs/components/prism-java.min.js";
import "prismjs/components/prism-javascript.min.js";
import "prismjs/components/prism-python.min.js";
import "prismjs/components/prism-typescript.min.js";
import "prismjs/themes/prism-okaidia.css";
import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

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
}

export default function ChatSidebar({
  apiUrl,
  isOpen,
  onToggle,
  repoData,
  githubToken,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [width, setWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const getFileNameFromPath = (path: string) => path.split("/").pop() || path;

  const getRepoContext = () => {
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

Estructura del repositorio:
${formatStructure(repoData.repoStructure)}
`;
  };

  useEffect(() => {
    const highlight = () => {
      Prism.highlightAll();
    };
    highlight();
  }, [messages, repoData.fileContent, repoData.currentPath]);

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
    if (!input.trim()) return;

    try {
      setLoading(true);
      const newMessage = { role: "user", content: input };
      const contextMessage = {
        role: "system",
        content: `Contexto:\n${getRepoContext()}\nInstrucciones: Responde en markdown usando el contexto del repositorio`,
      };

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
          messages: [contextMessage, ...messages, newMessage],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.choices[0].message.content },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error al obtener respuesta" },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    }
  };

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
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] pb-3"
        >
          {messages.map((msg, i) => {
            if (msg.role === "system") return null;
            return (
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
                <div
                  className="prose prose-invert text-sm"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(
                        /```(\w+)?\n([\s\S]*?)```/g,
                        (_, lang = "text", code) => {
                          return `<pre class="language-${lang}"><code>${Prism.highlight(
                            code,
                            Prism.languages[lang] || Prism.languages.text,
                            lang
                          )}</code></pre>`;
                        }
                      )
                      .replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            );
          })}
          {loading && (
            <div className="flex items-center space-x-2 text-[#8b949e] pl-4">
              <div className="dot-flashing"></div>
              <span className="text-sm">Generando respuesta...</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="relative mt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#c9d1d9] focus:ring-2 focus:ring-[#1f6feb] focus:outline-none"
            placeholder="Escribe tu pregunta..."
            disabled={loading}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#58a6ff]"
            disabled={loading}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
