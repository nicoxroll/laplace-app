"use client";

import { createContext, useContext, useReducer, ReactNode, useState } from "react";
import type { ChatState, Message } from "@/types/chat";

type ChatAction =
  | { type: "TOGGLE_CHAT" }
  | { type: "TOGGLE_EXPAND" }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_LAST_MESSAGE"; payload: string }
  | { type: "SET_LOADING"; payload: boolean };

type ChatContextType = {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const initialState: ChatState = {
  isOpen: false,
  isExpanded: false,
  messages: [],
  loading: false,
  codeIndexReady: false,
  setCodeIndexReady: () => {},
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "TOGGLE_CHAT":
      return {
        ...state,
        isOpen: !state.isOpen,
      };
    case "TOGGLE_EXPAND":
      return {
        ...state,
        isExpanded: !state.isExpanded,
      };
    case "ADD_MESSAGE":
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case "UPDATE_LAST_MESSAGE":
      return {
        ...state,
        messages: state.messages.map((msg, i) =>
          i === state.messages.length - 1
            ? { ...msg, content: action.payload }
            : msg
        ),
      };
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [codeIndexReady, setCodeIndexReady] = useState(false);
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const value = {
    state: {
      ...state,
      codeIndexReady,
      setCodeIndexReady,
    },
    dispatch,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
