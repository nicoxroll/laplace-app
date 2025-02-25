"use client";

import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { AlertCircle, Shield } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

// First, update the SecurityAlert interface
interface SecurityAlert {
  id: number | string;
  affected_package: string;
  severity: "critical" | "high" | "moderate" | "low";
  title: string;
  description: string;
  created_at: string;
  state: "open" | "fixed";
}

// Update the SecurityReport interface
interface SecurityReport {
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

export function SecuritySection({ repository }: { repository: Repository }) {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Add near the top of your component
  useEffect(() => {
    console.log("Session state:", {
      isAuthenticated: !!session,
      hasAccessToken: !!session?.accessToken,
    });

    console.log("Repository state:", {
      hasRepo: !!repository,
      fullName: repository?.full_name,
      provider: repository?.provider,
    });
  }, [session, repository]);

  // Update the auth check in fetchSecurityAlerts
  useEffect(() => {
    async function fetchSecurityAlerts() {
      if (!session?.user?.accessToken || !repository?.full_name) {
        console.log("Missing requirements:", {
          hasToken: !!session?.user?.accessToken, // Changed from session?.accessToken
          hasRepo: !!repository?.full_name,
          token: session?.user?.accessToken?.slice(0, 10) + "...",
        });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [owner, repo] = repository.full_name.split("/");
        const endpoints = [
          `https://api.github.com/repos/${owner}/${repo}/code-scanning/alerts`,
          `https://api.github.com/repos/${owner}/${repo}/security-advisories`,
          `https://api.github.com/repos/${owner}/${repo}/vulnerability-alerts`,
        ];

        const responses = await Promise.all(
          endpoints.map(async (endpoint) => {
            try {
              const res = await fetch(endpoint, {
                headers: {
                  Authorization: `Bearer ${session.user.accessToken}`,
                  Accept: "application/vnd.github.v3+json",
                  "X-GitHub-Api-Version": "2022-11-28",
                },
              });

              if (!res.ok) {
                console.log(`API ${endpoint} returned ${res.status}`);
                return {
                  url: endpoint,
                  status: res.status,
                  ok: false,
                  data: null,
                };
              }

              // Check if there's content before trying to parse
              const text = await res.text();
              const data = text ? JSON.parse(text) : null;

              return {
                url: endpoint,
                status: res.status,
                ok: true,
                data,
              };
            } catch (error) {
              console.error(`Error fetching ${endpoint}:`, error);
              return { url: endpoint, status: 500, ok: false, data: null };
            }
          })
        );

        console.log(
          "GitHub API responses:",
          responses.map((r) => ({
            url: r.url,
            status: r.status,
            hasData: !!r.data,
          }))
        );

        // Collect all alerts from successful responses
        const allAlerts = [];
        for (const response of responses) {
          if (response.ok && response.data) {
            if (Array.isArray(response.data)) {
              allAlerts.push(...response.data);
            }
          }
        }

        if (allAlerts.length > 0) {
          const processedAlerts = allAlerts
            .filter((alert) => alert && typeof alert === "object")
            .map((alert: any) => {
              try {
                const cleanText = (text: any) =>
                  typeof text === "string" ? text : String(text || "");

                return {
                  id: String(alert.number || alert.id || Math.random()),
                  affected_package: cleanText(
                    alert.tool?.name ||
                      alert.securityVulnerability?.package?.name ||
                      "Unknown"
                  ),
                  severity: (
                    alert.rule?.severity ||
                    alert.severity ||
                    "low"
                  ).toLowerCase(),
                  title: cleanText(
                    alert.rule?.description ||
                      alert.title ||
                      alert.message ||
                      "Unknown Issue"
                  ),
                  description: cleanText(
                    alert.most_recent_instance?.message ||
                      alert.description ||
                      ""
                  ),
                  created_at: String(
                    alert.created_at || new Date().toISOString()
                  ),
                  state: alert.state === "fixed" ? "fixed" : "open",
                } as SecurityAlert;
              } catch (e) {
                console.error("Error processing alert:", e);
                return null;
              }
            })
            .filter(Boolean) as SecurityAlert[];

          // Deduplicate alerts based on title and description
          const uniqueAlerts = processedAlerts.reduce((acc, current) => {
            const isDuplicate = acc.some(
              (alert) =>
                alert.title === current.title &&
                alert.description === current.description
            );
            if (!isDuplicate) {
              acc.push(current);
            }
            return acc;
          }, [] as SecurityAlert[]);

          setAlerts(uniqueAlerts);
        } else {
          setAlerts([]);
          console.log("No alerts found in responses");
        }
      } catch (err) {
        console.error("Security fetch error:", err);
        setError(
          err instanceof Error
            ? `Failed to fetch security data: ${err.message}`
            : "Failed to fetch security data"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchSecurityAlerts();
  }, [repository, session]);

  // DeepSeek Analysis
  const startAnalysis = useCallback(async () => {
    if (!repository?.full_name || analyzing) return;

    setAnalyzing(true);
    setError(null);
    setReport({
      content:
        "# Security Analysis Report\n\n_Analyzing repository content..._",
      isStreaming: true,
      timestamp: Date.now(),
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // First, get the repository content
      const [owner, repo] = repository.full_name.split("/");
      const contentResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents`,
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (!contentResponse.ok) {
        throw new Error("Failed to fetch repository content");
      }

      const contents = await contentResponse.json();

      // Start the security analysis with repository context
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository: repository.full_name,
          provider: repository.provider,
          contents: contents,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Analysis request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream available");

      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.choices?.[0]?.delta?.content) {
                fullContent += data.choices[0].delta.content;
                setReport((prev) => ({
                  content: fullContent,
                  isStreaming: true,
                  timestamp: Date.now(),
                }));
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }

      setReport((prev) => ({
        content: fullContent,
        isStreaming: false,
        timestamp: Date.now(),
      }));
    } catch (err) {
      if (err.name === "AbortError") {
        setReport({
          content:
            "# Analysis Cancelled\n\nThe security analysis was interrupted.",
          isStreaming: false,
          timestamp: Date.now(),
        });
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed");
      }
    } finally {
      setAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, [repository, session]);

  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAnalyzing(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl p-6 bg-[#161b22] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-blue-400">
          <Shield className="h-6 w-6" />
          Loading Security Overview...
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-[#0d1117] rounded-lg animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-700 rounded w-1/2" />
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
          <AlertCircle className="h-6 w-6" />
          Error Loading Security Data
        </h2>
        <div className="space-y-4">
          <p className="text-red-300 font-mono text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <SectionCard
      icon={Shield}
      title={`Security Overview - ${repository.full_name}`}
    >
      {/* Security content */}
      <div className="space-y-6">
        {/* Security Alerts Section */}
        <div className="space-y-6">
          {/* Alerts Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Critical/High
              </h3>
              <p className="text-2xl font-bold text-red-400">
                {
                  alerts.filter((a) =>
                    ["critical", "high"].includes(a.severity)
                  ).length
                }
              </p>
            </div>
            <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Open Alerts
              </h3>
              <p className="text-2xl font-bold text-yellow-400">
                {alerts.filter((a) => a.state === "open").length}
              </p>
            </div>
            <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Fixed</h3>
              <p className="text-2xl font-bold text-green-400">
                {alerts.filter((a) => a.state === "fixed").length}
              </p>
            </div>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-200">
              Security Alerts
            </h3>
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-200">
                        {alert.title}
                      </h4>
                      <p className="text-sm text-gray-400 mt-1">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {alert.affected_package}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            alert.severity === "critical"
                              ? "bg-red-500/20 text-red-400"
                              : alert.severity === "high"
                              ? "bg-orange-500/20 text-orange-400"
                              : alert.severity === "moderate"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
                <p className="text-gray-400">No security alerts found</p>
              </div>
            )}
          </div>

          {/* Analysis Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-200">
                AI Security Analysis
              </h3>
              <button
                onClick={analyzing ? stopAnalysis : startAnalysis}
                className={`px-4 py-2 rounded-lg text-sm ${
                  analyzing
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                }`}
              >
                {analyzing ? "Stop Analysis" : "Start Analysis"}
              </button>
            </div>

            {report && (
              <div
                ref={analysisRef}
                className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d] prose prose-invert max-w-none"
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const language = match ? match[1] : "";

                      return !inline && match ? (
                        <div className="relative group">
                          <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(String(children));
                              }}
                              className="p-1.5 rounded bg-[#1c2128] hover:bg-[#30363d] text-gray-400"
                              title="Copy code"
                            >
                              <svg
                                width="16"
                                height="16"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z" />
                              </svg>
                            </button>
                          </div>
                          <SyntaxHighlighter
                            language={language}
                            style={oneDark}
                            customStyle={{
                              margin: 0,
                              borderRadius: "6px",
                              padding: "1rem",
                            }}
                            showLineNumbers
                            lineNumberStyle={{
                              minWidth: "3em",
                              paddingRight: "1em",
                              color: "#484f58",
                              textAlign: "right",
                              userSelect: "none",
                            }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code
                          className="bg-[#1c2128] px-2 py-1 rounded text-sm font-mono"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    // Enhanced markdown styling
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-200 mb-4">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold text-gray-200 mt-6 mb-4">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-bold text-gray-200 mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-300 mb-4 leading-relaxed">
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-300">
                        {children}
                      </ul>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-300">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#30363d] pl-4 italic text-gray-400 my-4">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {report.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
