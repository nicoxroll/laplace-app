"use client";

import { ChevronRight, Send } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

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
  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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
  Repositorio actual: ${repoData.selectedRepo}
  Ruta actual: ${repoData.currentPath || "root"}
  
  Estructura del repositorio:
  ${formatStructure(repoData.repoStructure)}
  
  Contenido del archivo actual:
  ${repoData.fileContent.join("\n").slice(0, 2000)}${
      repoData.fileContent.join("\n").length > 2000 ? "..." : ""
    }
  `;
  };

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    document.body.style.cursor = "ew-resize"; // Cambia cursor en todo el body
    document.body.style.userSelect = "none"; // Previene selección de texto
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(Math.min(Math.max(newWidth, 200), 800)); // Rango más amplio
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

  useEffect(() => {
    document.addEventListener("mousemove", resize);
    document.addEventListener("mouseup", stopResizing);
    return () => {
      document.removeEventListener("mousemove", resize);
      document.removeEventListener("mouseup", stopResizing);
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
        content: `Contexto del repositorio GitHub:
      ${getRepoContext()}
      
      Instrucciones:
      1. Responde en el mismo idioma del usuario
      2. Usa markdown para código
      3. Sé conciso
      4. Referencia rutas de archivos cuando sea relevante
      5. Considera la estructura del repositorio para sugerencias`,
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
        {
          role: "assistant",
          content: data.choices[0].message.content,
        },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error al obtener respuesta",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        chatContainerRef.current?.scrollTo(
          0,
          chatContainerRef.current.scrollHeight
        );
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
        transition: isResizing ? "none" : "width 0.2s ease", // Transición suave
      }}
    >
      {/* Control de redimensionado (barra vertical izquierda) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-gray-500 z-50"
        onMouseDown={startResizing}
        data-testid="resize-handle"
      />

      <div className="p-3 h-full flex flex-col relative">
        {/* Botón de toggle */}
        <button
          onClick={onToggle}
          className={`absolute -left-3 top-1/2 -translate-y-1/2 bg-[#161b22] p-1.5 rounded-full border border-[#30363d] hover:bg-[#30363d] z-50 ${
            isOpen ? "" : "rotate-180"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Área del chat */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-[#0d1117] pb-3"
        >
          {messages.map((msg, i) => {
            if (msg.role === "system") return null;
            return (
              <div
                key={i}
                className={`p-2 mb-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-[#161b22] ml-6"
                    : "bg-[#21262d] mr-6"
                }`}
              >
                {msg.role === "assistant" && repoData.selectedRepo && (
                  <div className="text-xs text-gray-400 mb-1">
                    Contexto usado: {repoData.selectedRepo} -{" "}
                    {repoData.currentPath || "root"}
                  </div>
                )}
                <div
                  className="text-sm prose prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: msg.content.replace(/\n/g, "<br />"),
                  }}
                />
              </div>
            );
          })}
          {loading && (
            <div className="p-2 mb-2 rounded-lg bg-[#21262d] mr-6">
              <p className="text-sm text-gray-400">Escribiendo...</p>
            </div>
          )}
        </div>

        {/* Formulario de entrada */}
        <form onSubmit={handleSubmit} className="relative mt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm"
            placeholder="Escribe tu pregunta..."
            disabled={loading}
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            disabled={loading}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}
