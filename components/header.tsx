"use client";

import { AgentsSection } from "@/components/agents-section";
import { CodeSection } from "@/components/code-section";
import { InsightsSection } from "@/components/insights-section";
import { IssuesSection } from "@/components/issues-section";
import { PullRequestsSection } from "@/components/pull-requests-section";
import { RepositoryList } from "@/components/repository-list";
import { SecuritySection } from "@/components/security-section";
import type { Repository } from "@/types/repository";
import {
  Bot,
  ChevronDown,
  CircleDot,
  Code,
  GitPullRequest,
  LineChart,
  Shield,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Header({ activeSection, onSectionChange }: HeaderProps) {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sections = [
    { id: "code", label: "Code", icon: Code },
    { id: "issues", label: "Issues", icon: CircleDot },
    { id: "pullRequests", label: "Pull Requests", icon: GitPullRequest },
    { id: "security", label: "Security", icon: Shield },
    { id: "insights", label: "Insights", icon: LineChart },
    { id: "agents", label: "Agents", icon: Bot },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-[#161b22] border-b border-[#30363d]">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-blue-400" />
            Laplace
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${
                    activeSection === section.id
                      ? "bg-[#1f6feb] text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile */}
        {session?.user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-[#30363d] transition-colors"
            >
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || "User avatar"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {session.user.name?.[0] || "U"}
                </div>
              )}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#161b22] border border-[#30363d] rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-[#30363d]">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {session.user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-[#30363d]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default function HomePage() {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
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
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a valid section</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117]">
      <Header
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex gap-4 p-4 flex-1 overflow-hidden">
        <div className="w-1/3 overflow-auto">
          <RepositoryList
            selectedRepo={selectedRepo}
            onSelect={setSelectedRepo}
          />
        </div>
        <div className="w-2/3 overflow-auto">{renderSection()}</div>
      </div>
    </div>
  );
}
