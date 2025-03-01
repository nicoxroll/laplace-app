"use client";

import { useRepository } from "@/contexts/repository-context";
import { FileService } from "@/services/file-service";
import { RepositoryService } from "@/services/repository-service";
import type { Branch, Commit } from "@/types/repository";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Check,
  Copy,
  Download,
  FileCode,
  GitBranch,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { FileTree } from "./file-tree";

export function CodeViewer() {
  const {
    selectedRepo,
    currentPath,
    fileContent,
    currentFile,
    setFileContent,
    currentBranch,
    setCurrentBranch,
    currentCommit,
    setCurrentCommit,
  } = useRepository();
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [isBranchesOpen, setIsBranchesOpen] = useState(false);
  const [commits, setCommits] = useState<Commit[]>([]);
  const [isCommitsOpen, setIsCommitsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileService = FileService.getInstance();
  const repositoryService = RepositoryService.getInstance();
  const { data: session } = useSession();

  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedRepo || !session?.user?.accessToken) return;

      setIsLoading(true);
      try {
        const branchesData = await repositoryService.fetchBranches(
          selectedRepo,
          session.user.accessToken
        );
        setBranches(branchesData);
        setSelectedBranch(selectedRepo.default_branch);
      } catch (error) {
        console.error("Error fetching branches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBranches();
  }, [selectedRepo, session]);

  useEffect(() => {
    const fetchCommits = async () => {
      if (!selectedRepo || !session?.user?.accessToken || !selectedBranch)
        return;

      setIsLoading(true);
      try {
        const commitsData = await repositoryService.fetchCommits(
          selectedRepo,
          session.user.accessToken,
          selectedBranch
        );
        setCommits(commitsData);
      } catch (error) {
        console.error("Error fetching commits:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [selectedRepo, session, selectedBranch]);

  useEffect(() => {
    const updateContent = async () => {
      if (!selectedRepo || !session?.user?.accessToken || !currentPath) return;

      setIsLoading(true);
      try {
        const ref =
          currentCommit || currentBranch || selectedRepo.default_branch;
        const content = await repositoryService.fetchFileContent(
          selectedRepo,
          session.user.accessToken,
          currentPath,
          ref
        );

        if (content.length > 0) {
          setFileContent(content);
        }
      } catch (error) {
        console.error("Error updating content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    updateContent();
  }, [selectedRepo, currentPath, currentBranch, currentCommit, session]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fileContent.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([fileContent.join("\n")], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentPath.split("/").pop() || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getFileSize = () => {
    const bytes = new Blob([fileContent.join("\n")]).size;
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading content...
        </div>
      );
    }

    if (!fileContent || fileContent.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Select a file from the repository to view its contents
        </div>
      );
    }

    try {
      const processedContent = fileService.processFileContent(
        fileContent,
        currentFile?.encoding
      );

      if (currentPath && fileService.isImage(currentPath)) {
        const imageUrl = fileService.getRawUrl(selectedRepo!, currentPath);
        return (
          <div className="flex items-center justify-center h-full p-4">
            <img
              src={imageUrl}
              alt={currentPath.split("/").pop() || ""}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );
      }

      if (currentPath?.toLowerCase().endsWith(".md")) {
        return (
          <div className="p-8 prose prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {processedContent}
            </ReactMarkdown>
          </div>
        );
      }

      const language = currentPath?.split(".").pop() || "text";

      return (
        <div className="w-full h-full overflow-y-auto overflow-x-scroll scrollbar-custom">
          <div className="min-w-full inline-block">
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              showLineNumbers
              customStyle={{
                margin: 0,
                background: "#0d1117",
                padding: "1rem",
                minWidth: "100%",
                display: "inline-block",
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
              wrapLongLines={false} // Cambiado a false para permitir scroll horizontal
              lineProps={{
                style: { display: "block", whiteSpace: "pre" },
                className: "hover:bg-[#1c2128] px-4 transition-colors",
              }}
            >
              {processedContent}
            </SyntaxHighlighter>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Error rendering content:", error);
      return (
        <div className="flex items-center justify-center h-full text-red-400">
          Error processing file content
        </div>
      );
    }
  };

  // Update branch selection handler
  const handleBranchChange = async (branch: Branch) => {
    setSelectedBranch(branch.name);
    setCurrentBranch(branch.name);
    setCurrentCommit(null); // Reset commit when changing branch
    setIsBranchesOpen(false);
  };

  // Update commit selection handler
  const handleCommitSelect = async (commit: Commit) => {
    setCurrentCommit(commit.sha);
    setIsCommitsOpen(false);
  };

  // Agregar handlers para cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isBranchesOpen || isCommitsOpen) {
        const target = event.target as HTMLElement;
        if (
          !target.closest('[data-dropdown="branch"]') &&
          !target.closest('[data-dropdown="commits"]')
        ) {
          setIsBranchesOpen(false);
          setIsCommitsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isBranchesOpen, isCommitsOpen]);

  const renderFileInfo = () => {
    if (!currentPath || !fileContent) return null;

    // Asegurarnos de que fileContent sea un string
    const contentString = Array.isArray(fileContent)
      ? fileContent.join("\n")
      : fileContent;
    const lines = contentString.split("\n").length;
    const bytes = new TextEncoder().encode(contentString).length;
    const formattedSize =
      bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;

    return (
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {currentPath} • {lines} lines • {formattedSize}
      </Typography>
    );
  };

  // Para el selector de branches
  const renderBranchSelector = () => {
    return (
      <Box sx={{ position: "relative" }} data-dropdown="branch">
        <Button
          onClick={() => {
            setIsBranchesOpen(!isBranchesOpen);
            setIsCommitsOpen(false);
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            px: 2,
            py: 0.75,
            borderRadius: 1,
            border: 1,
            borderColor: "#30363d",
            color: "text.primary",
            bgcolor: "transparent",
            "&:hover": { bgcolor: "#30363d" },
          }}
        >
          <Box sx={{ fontSize: 18 }}>
            <GitBranch />
          </Box>
          <Typography variant="body2">
            {branches.length > 0
              ? currentBranch || selectedRepo?.default_branch
              : "Sin branches"}
          </Typography>
        </Button>
        {isBranchesOpen && (
          <Paper
            sx={{
              position: "absolute",
              top: "100%",
              right: 0,
              mt: 1,
              width: 300,
              maxHeight: 400,
              overflow: "auto",
              bgcolor: "#161b22",
              border: 1,
              borderColor: "#30363d",
              borderRadius: 1,
              zIndex: 1100,
            }}
          >
            {branches.length > 0 ? (
              branches.map((branch) => (
                <MenuItem
                  key={branch.name}
                  onClick={() => handleBranchChange(branch)}
                  sx={{
                    py: 1.5,
                    px: 2,
                    color: "text.primary",
                    bgcolor:
                      currentBranch === branch.name ? "#1c2128" : "transparent",
                    "&:hover": { bgcolor: "#30363d" },
                  }}
                >
                  <Typography variant="body2">{branch.name}</Typography>
                </MenuItem>
              ))
            ) : (
              <MenuItem
                disabled
                sx={{
                  py: 1.5,
                  px: 2,
                  color: "text.secondary",
                  "&.Mui-disabled": {
                    opacity: 1,
                  },
                }}
              >
                Repositorio sin branches
              </MenuItem>
            )}
          </Paper>
        )}
      </Box>
    );
  };

  // Eliminar las funciones anteriores de fullscreen y reemplazar por esta más simple
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: isFullscreen ? "100vh" : "100%",
        bgcolor: "background.default",
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : "auto",
        left: isFullscreen ? 0 : "auto",
        right: isFullscreen ? 0 : "auto",
        bottom: isFullscreen ? 0 : "auto",
        zIndex: isFullscreen ? 1300 : "auto",
      }}
    >
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{
          bgcolor: isFullscreen ? "#161b22" : "transparent",
        }}
      >
        <Toolbar sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              p: 1,
              borderBottom: 1,
              borderColor: "divider",
              overflowX: "auto",
              whiteSpace: "nowrap",
              gap: 1,
            }}
          >
            <IconButton
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "#30363d" },
              }}
            >
              {!isSidebarOpen ? (
                <PanelLeftClose size={18} />
              ) : (
                <PanelLeftOpen size={18} />
              )}
            </IconButton>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {selectedRepo && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FileCode size={16} /> {/* Reemplaza Source */}
                  <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {selectedRepo.name}
                  </Typography>
                </Box>
              )}
              {renderFileInfo()}
            </Box>
          </Box>

          <Box
            sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}
          >
            {/* Branch Selector */}
            {renderBranchSelector()}

            {/* History */}
            <Box sx={{ position: "relative" }} data-dropdown="commits">
              <Button
                onClick={() => {
                  setIsCommitsOpen(!isCommitsOpen);
                  setIsBranchesOpen(false);
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  border: 1,
                  borderColor: "#30363d",
                  color: "text.primary",
                  bgcolor: "transparent",
                  "&:hover": { bgcolor: "#30363d" },
                }}
              >
                <Box sx={{ fontSize: 18 }}>
                  <History />
                </Box>
                <Typography variant="body2">
                  {commits.length > 0 ? "History" : "No commits"}
                </Typography>
              </Button>
              {isCommitsOpen && (
                <Paper
                  sx={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    mt: 1,
                    width: 300,
                    maxHeight: 400,
                    overflow: "auto",
                    bgcolor: "#161b22",
                    border: 1,
                    borderColor: "#30363d",
                    borderRadius: 1,
                    zIndex: 1100,
                  }}
                >
                  {commits.length > 0 ? (
                    commits.map((commit) => (
                      <MenuItem
                        key={commit.sha}
                        onClick={() => handleCommitSelect(commit)}
                        sx={{
                          py: 1.5,
                          px: 2,
                          color: "text.primary",
                          bgcolor:
                            currentCommit === commit.sha
                              ? "#1c2128"
                              : "transparent",
                          "&:hover": { bgcolor: "#30363d" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ color: "text.primary" }}
                          >
                            {commit.message}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "text.secondary" }}
                          >
                            {commit.author.name} •{" "}
                            {new Date(commit.author.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem
                      disabled
                      sx={{
                        py: 1.5,
                        px: 2,
                        color: "text.secondary",
                        "&.Mui-disabled": {
                          opacity: 1,
                        },
                      }}
                    >
                      No commits found in this repository
                    </MenuItem>
                  )}
                </Paper>
              )}
            </Box>

            {/* Action buttons */}
            <IconButton
              size="small"
              onClick={toggleFullscreen}
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "#30363d" },
              }}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </IconButton>

            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                color: copied ? "success.main" : "text.secondary",
                "&:hover": { bgcolor: "#30363d" },
              }}
            >
              {copied ? <Check /> : <Copy size={16} />}{" "}
              {/* Reemplaza ContentCopy */}
            </IconButton>

            <IconButton
              size="small"
              onClick={handleDownload}
              sx={{
                color: "text.secondary",
                "&:hover": { bgcolor: "#30363d" },
              }}
            >
              <Download />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          display: "flex",
          flex: 1,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 240,
            bgcolor: "background.paper",
            borderRight: 1,
            borderColor: "divider",
            transform: isSidebarOpen ? "none" : "translateX(-100%)",
            transition: "transform 0.2s ease-in-out",
          }}
        >
          <FileTree />
        </Box>

        <Box
          sx={{
            flex: 1,
            overflow: "auto",
            marginLeft: isSidebarOpen ? "240px" : 0,
            transition: "margin-left 0.2s ease-in-out",
            width: "100%",
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
}
