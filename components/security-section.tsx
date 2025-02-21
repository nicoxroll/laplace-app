"use client";

import { ShieldAlert } from "lucide-react";
import Prism from "prismjs";
import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
}

interface FlowSidebarProps {
  apiUrl: string;
  repoData: {
    repoStructure: RepoItem[];
    selectedRepo: string | null;
  };
}

const CODE_EXTENSIONS = new Set([
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "html",
  "java",
  "cpp",
  "cs",
]);

const CONFIG_PATTERNS = [
  /(\/|^)(config|\.github|\.vscode|tests?|__mocks__|docker|scripts)(\/|$)/i,
  /\.(yml|yaml|toml|env|ini|cfg|conf|bak|css|jpeg|jpg|png|gif|svg|webp)$/i,
  /(\/|^)(tailwind|postcss|vite|webpack|jest|babel)\.config\.[jt]sx?$/i,
  /(\/|^)(tsconfig|jsconfig|next\.config|svelte\.config)\.[jt]sx?$/i,
  /(\/|^)\..*rc(\.[jt]sx?)?$/i,
];

export default function SecurityAnalysis({
  apiUrl,
  repoData,
}: FlowSidebarProps) {
  const [securityAnalysis, setSecurityAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const filterCodeFiles = useCallback((files: RepoItem[]) => {
    return files.filter((file) => {
      if (file.type !== "file") return false;
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const fullPath = file.path.toLowerCase();
      const isCodeFile = CODE_EXTENSIONS.has(extension);
      const isExcludedFile = CONFIG_PATTERNS.some(
        (pattern) =>
          pattern.test(fullPath) || pattern.test(file.name.toLowerCase())
      );
      return isCodeFile && !isExcludedFile;
    });
  }, []);

  const performAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setSecurityAnalysis("");

      const filteredCodeFiles = filterCodeFiles(repoData.repoStructure);
      if (filteredCodeFiles.length === 0) {
        throw new Error(
          "No se encontraron archivos de código válidos para analizar"
        );
      }

      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 100000);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "Eres un experto en seguridad de código. Analiza en el idioma que te hablan los siguientes archivos y detecta posibles vulnerabilidades. Organiza los resultados en formato markdown con secciones claras, viñetas y ejemplos de código cuando sea relevante.",
            },
            {
              role: "user",
              content: JSON.stringify({
                files: filteredCodeFiles.map((f) => f.path),
                metadata: {
                  repoName: repoData.selectedRepo,
                  totalFiles: filteredCodeFiles.length,
                },
              }),
            },
          ],
          model: "deepseek-r1-distill-qwen-7b",
          temperature: 0.3,
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok)
        throw new Error(`Error ${response.status}: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader)
        throw new Error("No se pudo obtener el lector de la respuesta");

      let analysisResult = "";
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
                analysisResult += data.choices[0].delta.content;
                setSecurityAnalysis(
                  (prev) => prev + data.choices[0].delta.content
                );
              }
            } catch (err) {
              console.error("Error parsing chunk:", err);
            }
          }
        }
      }
      setHasFetched(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, [apiUrl, filterCodeFiles, repoData.repoStructure, repoData.selectedRepo]);

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      repoData.selectedRepo &&
      !hasFetched &&
      repoData.repoStructure.length > 0
    ) {
      const timer = setTimeout(performAnalysis, 300);
      return () => clearTimeout(timer);
    }
  }, [
    repoData.selectedRepo,
    repoData.repoStructure,
    hasFetched,
    performAnalysis,
  ]);

  useEffect(() => {
    setHasFetched(false);
    setSecurityAnalysis("");
  }, [repoData.selectedRepo]);

  useEffect(() => {
    Prism.highlightAll();
  }, [securityAnalysis]);

  const renderMarkdown = useCallback(
    (content: string) => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const language =
              className?.replace("language-", "") || "javascript";
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
          em({ children }) {
            return <span className="text-gray-400 italic">{children}</span>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-gray-600 pl-4 text-gray-400 my-4">
                {children}
              </blockquote>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-xl font-semibold text-blue-300 mt-6 mb-3">
                {children}
              </h2>
            );
          },
          ul({ children }) {
            return (
              <ul className="list-disc pl-6 space-y-2 my-4">{children}</ul>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    []
  );

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <ShieldAlert className="h-6 w-6" />
          Analizando repositorio...
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-red-400">
          <ShieldAlert className="h-6 w-6" />
          Error en el análisis
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
          <button
            onClick={performAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reintentar análisis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <ShieldAlert className="h-6 w-6" />
        Análisis de seguridad -{" "}
        {repoData.selectedRepo || "Sin repositorio seleccionado"}
      </h2>

      {securityAnalysis ? (
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(securityAnalysis)}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={performAnalysis}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-1"
            >
              Actualizar análisis
            </button>
            {loading && (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Detener
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-400 italic">
          {repoData.selectedRepo
            ? "Preparando el análisis de seguridad..."
            : "Selecciona un repositorio para comenzar el análisis"}
        </p>
      )}
    </div>
  );
}
