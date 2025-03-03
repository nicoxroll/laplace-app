"use client";

import { useChat } from "@/contexts/chat-context";
import { useRepository } from "@/contexts/repository-context";
import { ChatService } from "@/services/chat-service";
import { Repository } from "@/types/repository";
import {
  Alert,
  Box,
  Button,
  Collapse,
  LinearProgress,
  styled,
  Typography,
  useTheme,
} from "@mui/material";
import { Check, Copy, RefreshCw, Shield, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const StyledContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  marginTop: theme.spacing(2),
}));

interface SecurityReport {
  content: string;
  isStreaming: boolean;
  timestamp: number;
}

interface SecuritySectionProps {
  repository: Repository;
}

export function SecuritySection({ repository }: SecuritySectionProps) {
  const { data: session } = useSession();
  const { selectedRepo, currentPath, fileContent } = useRepository();
  const { state } = useChat();
  const theme = useTheme();

  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<SecurityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const analysisRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const chatService = ChatService.getInstance();

  // Add this helper function to process repository files in chunks
  const processRepositoryInChunks = async (
    repoContext: any,
    analysisType: string,
    accessToken: string,
    controller: AbortController,
    onUpdate: (content: string) => void
  ): Promise<string> => {
    const MAX_FILES_PER_CHUNK = 10;
    const MAX_CONTENT_SIZE = 50000; // ~50KB per chunk to stay within API limits
    let fullContent = "";

    // Extract repository information
    const { repository, files = [] } = repoContext;

    // If we don't have many files, just do a single analysis
    if (files.length <= MAX_FILES_PER_CHUNK) {
      return analyzeRepositoryChunk(
        repoContext,
        analysisType,
        accessToken,
        controller,
        (content) => onUpdate(fullContent + content)
      );
    }

    console.log(
      `Processing large repository (${files.length} files) in chunks`
    );

    // Initialize the report structure
    fullContent = "# Security Analysis Report\n\n";
    onUpdate(fullContent);

    // Process files in chunks
    for (let i = 0; i < files.length; i += MAX_FILES_PER_CHUNK) {
      const chunkFiles = files.slice(i, i + MAX_FILES_PER_CHUNK);
      const totalSize = chunkFiles.reduce(
        (size: number, file: { content?: string }) =>
          size + (file.content?.length || 0),
        0
      );

      // If this chunk is too large, split it further
      if (totalSize > MAX_CONTENT_SIZE) {
        for (const file of chunkFiles) {
          // Process each large file individually
          if (file.content && file.content.length > MAX_CONTENT_SIZE) {
            console.log(`Processing large file individually: ${file.path}`);

            const chunkContext = {
              ...repoContext,
              files: [file],
              chunkInfo: `File ${i + 1} of ${files.length}: ${file.path}`,
            };

            const chunkResult = await analyzeRepositoryChunk(
              chunkContext,
              "file-security",
              accessToken,
              controller,
              (content) => onUpdate(fullContent + content)
            );

            fullContent += `\n## Analysis of ${file.path}\n${chunkResult}\n`;
            onUpdate(fullContent);
          }
        }
      } else {
        // Process this chunk of files
        const chunkContext = {
          ...repoContext,
          files: chunkFiles,
          chunkInfo: `Processing files ${i + 1} to ${Math.min(
            i + MAX_FILES_PER_CHUNK,
            files.length
          )} of ${files.length}`,
        };

        console.log(`Processing chunk of ${chunkFiles.length} files`);

        const chunkResult = await analyzeRepositoryChunk(
          chunkContext,
          "chunk-security",
          accessToken,
          controller,
          (content) => onUpdate(fullContent + content)
        );

        fullContent += chunkResult;
        onUpdate(fullContent);
      }

      // Add separator between chunks
      fullContent += "\n\n---\n\n";
      onUpdate(fullContent);
    }

    // Add summary section
    fullContent +=
      "\n## Overall Security Assessment\n\nThis is a consolidated report from analyzing the repository in chunks.\n";
    onUpdate(fullContent);

    return fullContent;
  };

  // Helper function to analyze a single chunk of the repository
  const analyzeRepositoryChunk = async (
    chunkContext: any,
    analysisType: string,
    accessToken: string,
    controller: AbortController,
    onUpdate: (content: string) => void
  ): Promise<string> => {
    const apiPayload = {
      context: chunkContext,
      repoContext: chunkContext,
      analysisType: analysisType,
    };

    console.log(
      `Sending API request for ${chunkContext.files?.length || 0} files`
    );

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(apiPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Analysis request failed (${response.status}): ${errorText}`
      );
    }

    // Process the stream response
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream available");

    let chunkContent = "";
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
              chunkContent += data.choices[0].delta.content;
              onUpdate(chunkContent);
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    }

    return chunkContent;
  };

  // Update the initializeIndexer function in security-section.tsx
  const initializeIndexer = useCallback(async () => {
    if (!selectedRepo || !session?.user?.accessToken) {
      setError("Missing repository or session data");
      return;
    }

    // Make sure we have a provider
    if (!selectedRepo.provider) {
      setError("Repository provider not specified");
      return;
    }

    setIsIndexing(true);
    setIndexProgress(0);
    setError(null);
    state.setCodeIndexReady(false);

    try {
      console.log(
        `Initializing indexer for ${selectedRepo.provider} repository: ${selectedRepo.full_name}`
      );

      // Pass the progress callback directly to the ChatService method
      await chatService.initializeCodeIndexer(
        session.user.accessToken,
        selectedRepo.full_name,
        selectedRepo.provider,
        (progress) => {
          const percentage = Math.round(progress * 100);
          setIndexProgress(percentage);
        }
      );

      const updatedIndexer = chatService.getCodeIndexer();
      if (!updatedIndexer || !updatedIndexer.codebase) {
        throw new Error("Failed to initialize code indexer");
      }

      console.log(
        `Files indexed for ${selectedRepo.provider}: ${
          Object.keys(updatedIndexer.codebase).length
        }`
      );
      state.setCodeIndexReady(true);
    } catch (error) {
      console.error(
        `Error initializing ${selectedRepo.provider} code indexer:`,
        error
      );
      setError(
        error instanceof Error
          ? error.message
          : "Failed to initialize code analysis"
      );
      state.setCodeIndexReady(false);
    } finally {
      setIsIndexing(false);
    }
  }, [selectedRepo, session?.user?.accessToken, state, chatService]);

  // Update useEffect to use shared code indexer
  useEffect(() => {
    if (
      selectedRepo &&
      session?.user?.accessToken &&
      !state.codeIndexReady &&
      !isIndexing
    ) {
      console.log("Triggering security section indexing");
      initializeIndexer();
    }
  }, [
    selectedRepo,
    session?.user?.accessToken,
    state.codeIndexReady,
    isIndexing,
    initializeIndexer,
  ]);

  // Update the startAnalysis function to handle asynchronous loading better
  const startAnalysis = useCallback(async () => {
    if (!selectedRepo?.full_name || analyzing) {
      return;
    }

    const codeIndexer = chatService.getCodeIndexer();
    if (!codeIndexer?.codebase) {
      setError("No indexed files available");
      return;
    }

    // Convert indexed files to the expected format
    const indexedFiles = Object.entries(codeIndexer.codebase).map(([path, content]) => ({
      path,
      content: content.toString(),
      language: path.split('.').pop() || 'text'
    }));

    setAnalyzing(true);
    setError(null);
    setReport({
      content: "# Starting Security Analysis...\n\nAnalyzing repository files...",
      isStreaming: true,
      timestamp: Date.now(),
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let currentChunk = 0;
      let fullReport = "";
      let hasMore = true;

      while (hasMore && !controller.signal.aborted) {
        let response;
        try {
          response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.user?.accessToken}`,
              "Cache-Control": "no-cache",
              "Connection": "keep-alive",
            },
            body: JSON.stringify({
              context: {
                repository: selectedRepo,
                files: indexedFiles,
                currentFile: currentPath ? { path: currentPath, content: fileContent } : undefined,
              },
              chunkIndex: currentChunk,
            }),
            signal: controller.signal,
          });
        } catch (fetchError) {
          console.error("Fetch error:", fetchError);
          if (fetchError instanceof Error && fetchError.name === "AbortError") {
            throw fetchError;
          }
          throw new Error("Failed to connect to analysis service. Please try again.");
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`Analysis request failed (${response.status}): ${errorText}`);
        }

        const totalChunks = parseInt(response.headers.get("X-Total-Chunks") || "1");
        hasMore = response.headers.get("X-Has-More") === "true";
        
        const progress = Math.round(((currentChunk + 1) / totalChunks) * 100);
        const progressReport = {
          content: `${fullReport}\n\n# Analyzing Part ${currentChunk + 1}/${totalChunks} (${progress}% complete)...\n`,
          isStreaming: true,
          timestamp: Date.now(),
        };
        setReport(progressReport);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let chunkContent = "";

        try {
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
                    chunkContent += data.choices[0].delta.content;
                    const updatedReport = {
                      content: `${fullReport}\n\n${chunkContent}`,
                      isStreaming: true,
                      timestamp: Date.now(),
                    };
                    setReport(updatedReport);
                  }
                } catch (e) {
                  console.warn("Error parsing chunk:", e);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        fullReport += (currentChunk === 0 ? "" : "\n\n") + chunkContent;
        currentChunk++;
      }

      setReport({
        content: fullReport,
        isStreaming: false,
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setReport({
          content: "# Analysis Cancelled\n\nAnalysis was interrupted by user.",
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
  }, [
    selectedRepo,
    analyzing,
    chatService,
    session?.user?.accessToken,
    currentPath,
    fileContent,
    setAnalyzing,
    setError,
    setReport,
    abortControllerRef
  ]);

  const stopAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setAnalyzing(false);
    }
  }, []);

  const handleReindex = useCallback(() => {
    console.log("Manual reindex triggered");
    state.setCodeIndexReady(false);
    initializeIndexer();
  }, [initializeIndexer, state]);

  // Check if we have indexed files
  const codeIndexer = chatService.getCodeIndexer();
  const hasIndexedFiles =
    codeIndexer &&
    codeIndexer.codebase &&
    Object.keys(codeIndexer.codebase).length > 0;

  return (
    <StyledContainer>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        sx={{
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Typography variant="h6" color="textPrimary">
          <Shield className="mr-2 inline-block h-5 w-5" />
          AI Security Analysis {selectedRepo && `- ${selectedRepo.full_name}`}
        </Typography>

        <Box 
          display="flex" 
          gap={2}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Button
            variant="outlined"
            color="primary"
            onClick={handleReindex}
            disabled={isIndexing}
            fullWidth={true}
            startIcon={
              <RefreshCw
                className={`h-4 w-4 ${isIndexing ? "animate-spin" : ""}`}
              />
            }
            sx={{
              textTransform: "none",
              boxShadow: "none",
              minWidth: { xs: '100%', sm: 'auto' },
              "&:hover": { boxShadow: "none" },
            }}
          >
            {isIndexing ? `Indexing ${indexProgress}%` : "Reindex"}
          </Button>

          <Button
            variant="contained"
            color={analyzing ? "error" : "primary"}
            onClick={analyzing ? stopAnalysis : startAnalysis}
            disabled={!selectedRepo || !hasIndexedFiles || isIndexing}
            fullWidth={true}
            startIcon={
              analyzing ? (
                <X className="h-4 w-4" />
              ) : (
                <Shield className="h-4 w-4" />
              )
            }
            sx={{
              textTransform: "none",
              boxShadow: "none",
              minWidth: { xs: '100%', sm: 'auto' },
              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            {analyzing ? "Stop Analysis" : "Start Analysis"}
          </Button>
        </Box>
      </Box>

      {isIndexing && (
        <LinearProgress
          variant="determinate"
          value={indexProgress}
          sx={{
            mb: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: theme.palette.action.selected,
            "& .MuiLinearProgress-bar": {
              borderRadius: 1,
            },
          }}
        />
      )}

      {!hasIndexedFiles && !isIndexing && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Indexing repository content... Analysis will be available shortly.
          </Typography>
        </Alert>
      )}

      {hasIndexedFiles && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Repository indexed successfully:{" "}
            {Object.keys(codeIndexer.codebase).length} files available for
            analysis
          </Typography>
        </Alert>
      )}

      <Collapse in={analyzing}>
        <LinearProgress
          color="primary"
          sx={{
            mb: 2,
            height: 2,
            borderRadius: 1,
            backgroundColor: theme.palette.action.selected,
            "& .MuiLinearProgress-bar": {
              borderRadius: 1,
            },
          }}
          variant={report?.isStreaming ? "indeterminate" : "determinate"}
          value={report?.isStreaming ? undefined : 100}
        />
      </Collapse>

      <Collapse in={!!error}>
        <Alert
          severity="error"
          sx={{
            mb: 2,
            border: `1px solid ${theme.palette.error.dark}`,
            backgroundColor: theme.palette.error.light,
          }}
          onClose={() => setError(null)}
        >
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Collapse>

      {report && (
        <Box ref={analysisRef} sx={{ mt: 2 }}>
          <ReactMarkdown
            components={{
              code({
                node,
                inline,
                className,
                children,
                ...props
              }: React.DetailedHTMLProps<
                React.HTMLAttributes<HTMLElement>,
                HTMLElement
              > & {
                inline?: boolean;
                node?: any;
              }) {
                const match = /language-(\w+)/.exec(className || "");
                const [copied, setCopied] = useState(false);

                const handleCopy = async (text: string) => {
                  await navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                };

                return !inline && match ? (
                  <div className="relative group">
                    <button
                      onClick={() => handleCopy(String(children))}
                      className="absolute right-2 top-2 p-2 rounded-md bg-[#1f2937] hover:bg-[#374151] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <div className="max-h-[400px] overflow-auto scrollbar-custom">
                      <SyntaxHighlighter
                        language={match[1]}
                        style={oneDark}
                        showLineNumbers
                        customStyle={{
                          margin: 0,
                          background: "#0d1117",
                          padding: "1rem",
                          borderRadius: "0.5rem",
                          border: "1px solid #30363d",
                        }}
                        lineNumberStyle={{
                          minWidth: "3em",
                          paddingRight: "1em",
                          color: "#484f58",
                          textAlign: "right",
                          userSelect: "none",
                          borderRight: "1px solid #30363d",
                        }}
                        wrapLines
                        wrapLongLines={false}
                        lineProps={{
                          style: { display: "block", whiteSpace: "pre" },
                          className:
                            "hover:bg-[#1c2128] px-4 transition-colors",
                        }}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                ) : (
                  <code
                    className="bg-[#1f2937] px-2 py-1 rounded text-gray-200"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              h1: ({ children }) => (
                <Typography variant="h4" gutterBottom sx={{ mt: 3 }}>
                  {children}
                </Typography>
              ),
              h2: ({ children }) => (
                <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                  {children}
                </Typography>
              ),
              p: ({ children }) => (
                <Typography
                  paragraph
                  sx={{
                    mb: 2,
                    lineHeight: 1.6,
                    color: theme.palette.text.secondary,
                  }}
                >
                  {children}
                </Typography>
              ),
              ul: ({ children }) => (
                <Box
                  component="ul"
                  sx={{
                    pl: 3,
                    mb: 2,
                    "& li": {
                      color: theme.palette.text.secondary,
                    },
                  }}
                >
                  {children}
                </Box>
              ),
              li: ({ children }) => (
                <Typography component="li" sx={{ mb: 1 }}>
                  {children}
                </Typography>
              ),
            }}
          >
            {report.content}
          </ReactMarkdown>
        </Box>
      )}
    </StyledContainer>
  );
}
