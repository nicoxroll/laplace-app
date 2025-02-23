"use client";

import { ShieldAlert } from "lucide-react";
import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism-okaidia.css";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
}

interface SecuritySectionProps {
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
}: SecuritySectionProps) {
  const [securityAnalysis, setSecurityAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasFetched, setHasFetched] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const analysisContainerRef = useRef<HTMLDivElement>(null);

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
      setHasFetched(true);

      // Verificar que la URL de la API es válida
      if (!apiUrl) {
        throw new Error("URL de la API no configurada");
      }

      const filteredCodeFiles = filterCodeFiles(repoData.repoStructure);
      if (filteredCodeFiles.length === 0) {
        throw new Error(
          "No se encontraron archivos de código válidos para analizar"
        );
      }

      const controller = new AbortController();
      setAbortController(controller);
      const timeoutId = setTimeout(() => controller.abort(), 100000);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Agregar cache-control para evitar problemas de caché
            "Cache-Control": "no-cache",
          },
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

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Error ${response.status}: ${errorText || response.statusText}`
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No se pudo obtener el lector de la respuesta");
        }

        const decoder = new TextDecoder();
        let analysisResult = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() && line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data?.choices?.[0]?.delta?.content) {
                  analysisResult += data.choices[0].delta.content;
                  setSecurityAnalysis(
                    (prev) => prev + data.choices[0].delta.content
                  );
                }
              } catch (err) {
                console.error("Error parsing chunk:", err, "Raw line:", line);
                // No interrumpir el proceso por errores de parsing
                continue;
              }
            }
          }
        }
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          throw new Error("La solicitud fue cancelada");
        }
        // Mejorar el mensaje de error para problemas de red
        if (!navigator.onLine) {
          throw new Error("No hay conexión a Internet");
        }
        throw new Error(`Error de red: ${(fetchError as Error).message}`);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Error completo:", err);
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
    if (securityAnalysis && analysisContainerRef.current) {
      const timer = setTimeout(() => {
        Prism.highlightAllUnder(analysisContainerRef.current!);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [securityAnalysis]);

  const renderMarkdown = useCallback(
    (content: string) => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <pre className={`rounded-lg p-4 bg-[#1e1e1e] my-4`}>
                <code
                  className={`language-${match[1]}`}
                  ref={(el) => {
                    if (el) Prism.highlightElement(el);
                  }}
                >
                  {String(children).replace(/\n$/, "")}
                </code>
              </pre>
            ) : (
              <code className="bg-[#1e1e1e] px-1 py-0.5 rounded" {...props}>
                {children}
              </code>
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-400">
            <ShieldAlert className="h-6 w-6" />
            Analizando repositorio...
          </h2>
          <button
            onClick={handleStop}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Detener
          </button>
        </div>
        <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
          <div className="flex flex-col gap-2">
            <div className="h-4 bg-gray-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-700 rounded w-1/2 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-400">
          <ShieldAlert className="h-6 w-6" />
          Análisis de seguridad - {repoData.selectedRepo || "Sin repositorio"}
        </h2>
        {!loading && !securityAnalysis && (
          <button
            onClick={performAnalysis}
            disabled={!repoData.selectedRepo}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Iniciar análisis
          </button>
        )}
      </div>

      {securityAnalysis ? (
        <div ref={analysisContainerRef} className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <div className="prose prose-invert max-w-none">
              {renderMarkdown(securityAnalysis)}
            </div>
          </div>
          <button
            onClick={performAnalysis}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Actualizar análisis
          </button>
        </div>
      ) : (
        <p className="text-gray-400 italic">
          {repoData.selectedRepo
            ? "Haz clic en 'Iniciar análisis' para comenzar"
            : "Selecciona un repositorio para comenzar el análisis"}
        </p>
      )}
    </div>
  );
}
