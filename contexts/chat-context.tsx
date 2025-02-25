"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatState {
  messages: Message[];
  isOpen: boolean;
  isExpanded: boolean;
  loading: boolean;
}

type ChatAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_LAST_MESSAGE"; payload: string }
  | { type: "TOGGLE_CHAT" }
  | { type: "TOGGLE_EXPAND" }
  | { type: "SET_LOADING"; payload: boolean };

const initialState: ChatState = {
  messages: [],
  isOpen: false,
  isExpanded: false,
  loading: false,
};

const ChatContext = createContext<
  | {
      state: ChatState;
      dispatch: React.Dispatch<ChatAction>;
    }
  | undefined
>(undefined);

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
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
    case "SET_LOADING":
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
