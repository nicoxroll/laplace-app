"use client";

import { ChatProvider } from "@/contexts/chat-context";
import { RepositoryProvider } from "@/contexts/repository-context";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { SessionProvider } from "next-auth/react";
import { darkTheme } from "../theme/darkTheme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <SessionProvider>
        <RepositoryProvider>
          <ChatProvider>{children}</ChatProvider>
        </RepositoryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
