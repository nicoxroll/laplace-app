"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { RepositoryList } from "@/components/repository-list";
import { CodeSection } from "@/components/code-section";
import { IssuesSection } from "@/components/issues-section";
import { PullRequestsSection } from "@/components/pull-requests-section";
import { SecuritySection } from "@/components/security-section";
import { InsightsSection } from "@/components/insights-section";
import { AgentsSection } from "@/components/agents-section";
import { useRepository } from "@/contexts/repository-context";
import { FloatingChat } from "@/components/floating-chat";

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/auth/signin");
    },
  });

  const { selectedRepo } = useRepository();
  const [activeSection, setActiveSection] = useState("code");

  const renderSection = () => {
    if (!selectedRepo) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <p>Select a repository to get started</p>
        </div>
      );
    }

    switch (activeSection) {
      case "code":
        return <CodeSection repository={selectedRepo} />;
      case "issues":
        return <IssuesSection repository={selectedRepo} />;
      case "pullRequests":
        return <PullRequestsSection repository={selectedRepo} />;
      case "security":
        return <SecuritySection repository={selectedRepo} />;
      case "insights":
        return <InsightsSection repository={selectedRepo} />;
      case "agents":
        return <AgentsSection repository={selectedRepo} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Header
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex h-[calc(100vh-4rem)]">
        <RepositoryList />
        <main className="flex-1 overflow-hidden">{renderSection()}</main>
        <FloatingChat />
      </div>
    </div>
  );
}
