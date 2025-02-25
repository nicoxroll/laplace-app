"use client";

import type React from "react";

import { SessionProvider } from "next-auth/react";
import { ChatProvider } from "@/contexts/chat-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ChatProvider>{children}</ChatProvider>
    </SessionProvider>
  );
}
