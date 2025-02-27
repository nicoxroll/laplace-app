"use client";

import { useChat } from "@/contexts/chat-context";
import { useRepository } from "@/contexts/repository-context";
import { ChatService } from "@/services/chat-service";
import { ChatInput } from "@/components/chat/chat-input";
import { Box, Fab, IconButton, Paper, LinearProgress, useTheme } from "@mui/material"; // Add useTheme here
import { Bot, Send, StopCircle, Maximize2, Minimize2, X } from "lucide-react";
import { Resizable } from "re-resizable";
import { useEffect, useRef, useState } from "react";
import { MessageRenderer } from "./chat/message-renderer";
import { useSession } from "next-auth/react"; // Add this import
import { CodeIndexer } from "@/services/code-indexer";


export function FloatingChat() {
  const { data: session } = useSession(); // Add this line
  const { state, dispatch } = useChat();
  const { selectedRepo, currentPath, fileContent } = useRepository();
  const theme = useTheme(); // Add this line to get the theme
  const [input, setInput] = useState("");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatService = ChatService.getInstance();
  const [size, setSize] = useState({
    width: state.isExpanded ? 800 : 380,
    height: state.isExpanded ? 600 : 500,
  });

  // Add loading indicator for indexing
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [state.messages]);

  useEffect(() => {
    setSize({
      width: state.isExpanded ? 800 : 380,
      height: state.isExpanded ? 600 : 500,
    });
  }, [state.isExpanded]);

  useEffect(() => {
    if (selectedRepo && session?.user?.accessToken) {
      chatService.initializeCodeIndexer(
        session.user.accessToken,
        selectedRepo.full_name
      );
    }
  }, [selectedRepo, session?.user?.accessToken]);

  useEffect(() => {
    if (selectedRepo && session?.user?.accessToken && !state.codeIndexReady) {
      setIsIndexing(true);
      setIndexProgress(0);

      const indexer = new CodeIndexer(session.user.accessToken);
      
      indexer.onProgress((progress) => {
        const percentage = Math.round(progress * 100);
        setIndexProgress(percentage);
      });

      indexer.indexRepository(selectedRepo.full_name)
        .then(() => {
          chatService.setCodeIndexer(indexer);
          state.setCodeIndexReady(true);
        })
        .catch((error) => {
          console.error("Error indexing repository:", error);
        })
        .finally(() => {
          setIsIndexing(false);
        });
    }
  }, [selectedRepo, session?.user?.accessToken, state.codeIndexReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.loading || !selectedRepo) return;

    const userMessage = { role: "user" as const, content: input };
    const controller = new AbortController();
    
    setAbortController(controller);
    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "ADD_MESSAGE", payload: userMessage });
    
    const currentInput = input;
    setInput("");

    try {
      await chatService.handleSubmit(
        currentInput,
        chatService.formatRepoContext({
          provider: selectedRepo.provider, // Usar el provider del repo seleccionado
          repository: selectedRepo,
          currentPath,
          currentFile: fileContent.length > 0 ? {
            path: currentPath,
            content: fileContent,
            language: currentPath.split('.').pop() || 'text'
          } : undefined
        }),
        controller.signal,
        () => {
          dispatch({
            type: "ADD_MESSAGE",
            payload: { 
              role: "assistant", 
              content: "",
              context: {
                repository: selectedRepo,
                currentFile: currentPath ? { path: currentPath } : undefined,
              }
            }
          });
        },
        (content) => {
          dispatch({
            type: "UPDATE_LAST_MESSAGE",
            payload: content
          });
        }
      );
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        dispatch({
          type: "ADD_MESSAGE",
          payload: {
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again."
          }
        });
      }
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      setAbortController(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleResize = (e: any, direction: any, ref: any, d: any) => {
    setSize({
      width: size.width + d.width,
      height: size.height + d.height,
    });

    // Ajustar la posición cuando se redimensiona hacia la izquierda
    if (direction === 'left' || direction === 'topLeft' || direction === 'bottomLeft') {
      const boxElement = ref.parentElement;
      if (boxElement) {
        const currentRight = parseInt(boxElement.style.right || '32');
        boxElement.style.right = `${currentRight}px`;
      }
    }
  };

  return (
    <>
      <Fab
        onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          bgcolor: "#1f6feb",
          "&:hover": { bgcolor: "#1a5ec9" },
          zIndex: 9999, // Aumentado para estar sobre todo
        }}
      >
        <Bot />
      </Fab>

      {state.isOpen && (
        <Box
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            zIndex: 9999, // Aumentado para estar sobre todo
          }}
        >
          <Resizable
            size={size}
            onResizeStop={handleResize}
            minWidth={300}
            minHeight={400}
            maxWidth={window.innerWidth - 64} // 64px de margen total
            maxHeight={window.innerHeight - 64} // Altura máxima ajustada al viewport
            enable={{
              top: true,
              right: true, // Habilitado resize desde la derecha
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }}
            bounds="window"
          >
            <Paper
              elevation={24}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                bgcolor: "#0d1117",
                border: 1,
                borderColor: "#30363d",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: "0 0 20px rgba(0,0,0,0.4)", // Sombra más prominente
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: "#30363d",
                  bgcolor: "#161b22",
                }}
              >
                <Box
                  sx={{ color: "text.primary", fontSize: 14, fontWeight: 500 }}
                >
                  Repository Chat
                </Box>
                <Box sx={{ display: "flex", gap: 0.5 }}>
                  <Box
                    component="button"
                    onClick={() => dispatch({ type: "TOGGLE_EXPAND" })}
                    sx={{
                      p: 1,
                      color: "text.secondary",
                      "&:hover": { color: "text.primary" },
                      cursor: "pointer",
                      bgcolor: "transparent",
                      border: "none",
                    }}
                  >
                    {state.isExpanded ? (
                      <Minimize2 size={16} />
                    ) : (
                      <Maximize2 size={16} />
                    )}
                  </Box>
                  <Box
                    component="button"
                    onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
                    sx={{
                      p: 1,
                      color: "text.secondary",
                      "&:hover": { color: "text.primary" },
                      cursor: "pointer",
                      bgcolor: "transparent",
                      border: "none",
                    }}
                  >
                    <X size={16} />
                  </Box>
                </Box>
              </Box>

              {/* Add indexing progress */}
              {isIndexing && (
                <LinearProgress
                  variant="determinate"
                  value={indexProgress}
                  sx={{ 
                    height: 2,
                    borderRadius: 1,
                    backgroundColor: theme.palette.action.selected,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 1
                    }
                  }}
                />
              )}

              <Box
                ref={chatContainerRef}
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  bgcolor: "#0d1117",
                  "&::-webkit-scrollbar": {
                    width: "8px",
                  },
                  "&::-webkit-scrollbar-track": {
                    bgcolor: "transparent",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "#30363d",
                    borderRadius: "4px",
                  },
                }}
              >
                {state.messages.length === 0 ? (
                  <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                    Start a conversation about the repository
                  </Box>
                ) : (
                  state.messages.map((msg, i) => (
                    <MessageRenderer key={i} message={msg} />
                  ))
                )}
              </Box>

              <ChatInput
                input={input}
                loading={state.loading}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
                onStop={() => abortController?.abort()}
              />
            </Paper>
          </Resizable>
        </Box>
      )}
    </>
  );
}
