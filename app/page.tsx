"use client";

import { AgentsSection } from "@/components/agents-section";
import { CodeSection } from "@/components/code-section";
import { FloatingChat } from "@/components/floating-chat";
import { Header } from "@/components/header";
import { InsightsSection } from "@/components/insights-section";
import { IssuesSection } from "@/components/issues-section";
import { LoadingScreen } from "@/components/loading-screen";
import { PullRequestsSection } from "@/components/pull-requests-section";
import { RepositoryList } from "@/components/repository-list";
import { SecuritySection } from "@/components/security-section";
import { useRepository } from "@/contexts/repository-context";
import { Box } from "@mui/material";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { KnowledgeSection } from "@/components/knowledge-section";

export default function HomePage() {
  const { selectedRepo } = useRepository();
  const [activeSection, setActiveSection] = useState("code");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return <LoadingScreen />;
  }

  if (!session) {
    return null;
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  const renderSection = () => {
    if (
      !selectedRepo &&
      activeSection !== "agents" &&
      activeSection !== "knowledge"
    ) {
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "text.secondary",
          }}
        >
          Select a repository to get started
        </Box>
      );
    }

    switch (activeSection) {
      case "code":
        return <CodeSection repository={selectedRepo!} />;
      case "issues":
        return <IssuesSection repository={selectedRepo!} />;
      case "pull-requests":
        return <PullRequestsSection repository={selectedRepo!} />;
      case "security":
        return <SecuritySection repository={selectedRepo!} />;
      case "insights":
        return <InsightsSection repository={selectedRepo!} />;
      case "agents":
        return <AgentsSection repository={selectedRepo} />;
      case "knowledge":
        return <KnowledgeSection />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Header
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        showSidebar={showSidebar}
        onToggleSidebar={toggleSidebar}
      />
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          pt: "64px", // Altura del AppBar
          overflow: "hidden", // Importante para contener la animación
        }}
      >
        {/* Sidebar con RepositoryList */}
        <Box
          sx={{
            width: 300,
            height: "100vh",
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            position: "fixed",
            left: 0,
            top: 0,
            pt: "64px", // Altura del header
            transform: showSidebar ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.3s ease-in-out",
            zIndex: 10,
            overflowY: "hidden", // Importante: contenedor principal sin scroll
            display: "flex",
            flexDirection: "column",
          }}
        >
          <RepositoryList />
        </Box>

        {/* Contenido principal */}
        <Box
          sx={{
            flexGrow: 1,
            p: 3,
            overflow: "auto",
            transition: "margin-left 0.3s ease-in-out",
            marginLeft: showSidebar ? "300px" : 0, // Usar margin en lugar de transformación negativa
          }}
        >
          {renderSection()}
        </Box>
      </Box>
      <FloatingChat />
    </Box>
  );
}
