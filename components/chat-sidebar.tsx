"use client";

import { ChevronRight, Send } from "lucide-react";
import { FormEvent, useRef, useState } from "react";

interface RepoItem {
  name: string;
  type: string;
  path: string;
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
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const getRepoContext = () => {
    if (!repoData.selectedRepo) return "No hay repositorio seleccionado";

    return JSON.stringify(
      {
        repository: repoData.selectedRepo,
        currentPath: repoData.currentPath || "root",
        structure: repoData.repoStructure,
        currentFileContent:
          repoData.fileContent.join("\n").slice(0, 2000) + "...",
      },
      null,
      2
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      setLoading(true);
      const newMessage = { role: "user", content: input };

      const contextMessage = {
        role: "system",
        content: `Contexto actual del repositorio GitHub:
        ${getRepoContext()}
        
        Instrucciones:
        - Responde en el mismo idioma del usuario
        - Usa markdown para formatear código
        - Mantén respuestas concisas
        - Referencia la estructura del repositorio cuando sea relevante`,
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
          model: "gpt-3.5-turbo",
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
      className={`fixed right-0 top-12 h-[calc(100vh-3rem)] w-64 transform ${
        isOpen ? "translate-x-0" : "translate-x-[calc(100%-2rem)]"
      } transition-transform duration-300 z-40 bg-[#0d1117] border-l border-[#30363d]`}
    >
      <div className="p-3 h-full flex flex-col">
        <button
          onClick={onToggle}
          className={`absolute -left-3 top-1/2 -translate-y-1/2 bg-[#161b22] p-1.5 rounded-full border border-[#30363d] hover:bg-[#30363d] z-50 ${
            isOpen ? "" : "rotate-180"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

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
