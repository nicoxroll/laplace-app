import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ChatProvider } from "@/contexts/chat-context";
import { RepositoryProvider } from "@/contexts/repository-context";

export const metadata: Metadata = {
  title: "Laplace",
  description: "AI-powered code analysis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <RepositoryProvider>
            <ChatProvider>{children}</ChatProvider>
          </RepositoryProvider>
        </Providers>
      </body>
    </html>
  );
}
