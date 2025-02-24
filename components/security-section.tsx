"use client";

import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Prism from "prismjs";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-typescript";
import "prismjs/themes/prism-okaidia.css";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useSession } from 'next-auth/react';
import type { Repository } from '../types/repository';

interface RepoItem {
  name: string;
  type: "file" | "dir" | "image";
  path: string;
}

interface SecurityAlert {
  id: number;
  affected_package: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  title: string;
  description: string;
  created_at: string;
  state: 'open' | 'fixed';
}

interface SecuritySectionProps {
  apiUrl?: string;
  repoData?: {
    repoStructure: RepoItem[];
    selectedRepo: string | null;
  };
  repository?: Repository;
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

export function SecuritySection({ apiUrl, repoData, repository }: SecuritySectionProps) {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [securityAnalysis, setSecurityAnalysis] = useState<string>("");
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

      // Verificar que la URL de la API y repoData existen
      if (!apiUrl) {
        throw new Error("URL de la API no configurada");
      }

      if (!repoData?.repoStructure) {
        throw new Error("No hay estructura del repositorio disponible");
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
  }, [apiUrl, filterCodeFiles, repoData?.repoStructure, repoData?.selectedRepo]);

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

  useEffect(() => {
    async function fetchSecurityAlerts() {
      if (!session?.accessToken || !repository) return;

      setLoading(true);
      setError(null);

      try {
        const baseUrl = repository.provider === 'github'
          ? `https://api.github.com/repos/${repository.full_name}/security/alerts`
          : `https://gitlab.com/api/v4/projects/${repository.id}/vulnerability_findings`;

        const response = await fetch(baseUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': repository.provider === 'github'
              ? 'application/vnd.github.v3+json'
              : 'application/json',
          },
        });

        if (!response.ok) throw new Error('Failed to fetch security alerts');

        const data = await response.json();
        setAlerts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching security alerts');
      } finally {
        setLoading(false);
      }
    }

    fetchSecurityAlerts();
  }, [repository, session]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10';
      case 'high':
        return 'text-orange-400 bg-orange-500/10';
      case 'moderate':
        return 'text-yellow-400 bg-yellow-500/10';
      case 'low':
        return 'text-blue-400 bg-blue-500/10';
      default:
        return 'text-gray-400 bg-gray-500/10';
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          <span className="ml-2 text-gray-400">Scanning repository...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg flex items-center">
          <Shield className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
        <Shield className="h-6 w-6" />
        Security Overview
      </h2>

      <div className="space-y-6">
        {/* Security Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#0d1117] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Critical</span>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">
              {alerts.filter(a => a.severity === 'critical').length}
            </span>
          </div>
          <div className="p-4 bg-[#0d1117] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">High</span>
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">
              {alerts.filter(a => a.severity === 'high').length}
            </span>
          </div>
          <div className="p-4 bg-[#0d1117] rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Moderate</span>
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <span className="text-2xl font-bold text-gray-200">
              {alerts.filter(a => a.severity === 'moderate').length}
            </span>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-200">Security Alerts</h3>
          {alerts.length === 0 ? (
            <div className="p-4 bg-[#0d1117] rounded-lg text-center text-gray-400">
              No security alerts found
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          getSeverityColor(alert.severity)
                        }`}>
                          {alert.severity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.state === 'fixed' 
                            ? 'text-green-400 bg-green-500/10' 
                            : 'text-red-400 bg-red-500/10'
                        }`}>
                          {alert.state}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-gray-200 mb-1">
                        {alert.title}
                      </h4>
                      <p className="text-sm text-gray-400">
                        {alert.description}
                      </p>
                      <div className="mt-2 text-xs text-gray-500">
                        Affected package: {alert.affected_package}
                      </div>
                    </div>
                    {alert.state === 'fixed' ? (
                      <CheckCircle className="h-5 w-5 text-green-400 ml-4" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 ml-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
