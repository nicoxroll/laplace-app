"use client";

import { useChat } from "@/contexts/chat-context";
import { useRepository } from "@/contexts/repository-context";
import { ChatService } from "@/services/chat-service";
import { Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChatHeader } from "./chat/chat-header";
import { ChatInput } from "./chat/chat-input";
import { MessageRenderer } from "./chat/message-renderer";

export function FloatingChat() {
  const { state, dispatch } = useChat();
  const { selectedRepo, currentPath, fileContent } = useRepository();
  const [input, setInput] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatService = ChatService.getInstance();

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [state.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || state.loading) return;

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
          provider: "github",
          repository: selectedRepo!,
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

  return (
    <>
      <button
        onClick={() => dispatch({ type: "TOGGLE_CHAT" })}
        className="fixed bottom-4 right-4 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg z-50"
      >
        <Bot className="h-6 w-6" />
      </button>

      {state.isOpen && (
        <div
          className={`fixed bottom-4 right-4 z-50 ${
            state.isExpanded ? "w-[800px] h-[600px]" : "w-[380px] h-[500px]"
          }`}
        >
          <div className="flex flex-col h-full bg-[#0d1117] rounded-lg border border-[#30363d] shadow-xl">
            <ChatHeader 
              isExpanded={state.isExpanded}
              onExpand={() => dispatch({ type: "TOGGLE_EXPAND" })}
              onClose={() => dispatch({ type: "TOGGLE_CHAT" })}
            />

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto scrollbar-custom p-4 space-y-4"
            >
              {state.messages.length === 0 ? (
                <div className="text-center text-gray-400">
                  Start a conversation about the repository
                </div>
              ) : (
                state.messages.map((msg, i) => (
                  <MessageRenderer key={i} message={msg} />
                ))
              )}
            </div>

            <ChatInput
              input={input}
              loading={state.loading}
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
              onStop={() => abortController?.abort()}
            />
          </div>
        </div>
      )}
    </>
  );
}
