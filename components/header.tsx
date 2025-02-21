"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Bot,
  Cat,
  ChevronDown,
  Code2,
  FileText,
  GitPullRequest,
  Menu,
  Plus,
  Settings,
  Shield,
} from "lucide-react";
import { Session } from "next-auth";
import Link from "next/link";
import { LoginButton } from "./login-button";

interface HeaderProps {
  session?: Session | null;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Header({
  session,
  activeSection,
  onSectionChange,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#161b22]">
      <div className="flex items-center px-4 h-16 gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-gray-300 hover:bg-[#30363d]"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Cat className="h-8 w-8 text-white" />
        {session?.user ? (
          <div className="flex items-center gap-2 text-sm">
            <Link href="#" className="hover:text-blue-300">
              {session.user.name}
            </Link>
          </div>
        ) : (
          <span className="text-sm">Laplace</span>
        )}

        {session?.user && (
          <div className="hidden lg:flex flex-1 mx-4">
            <div className="relative flex-1 max-w-2xl">
              <Input
                className="bg-[#0d1117] border-[#30363d] pl-3 pr-8 h-8 text-sm"
                placeholder="Type / to search"
              />
              <kbd className="absolute right-3 top-1.5 text-xs text-gray-500 border border-[#30363d] rounded px-1.5 py-0.5">
                /
              </kbd>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <LoginButton />
          {session?.user && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:bg-[#30363d]"
              >
                <Settings className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                className="text-gray-300 hover:bg-[#30363d]"
              >
                <Plus className="h-5 w-5" />
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
              <img
                src={session.user.image || "https://github.com/github.png"}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
            </>
          )}
        </div>
      </div>

      {session?.user && (
        <nav className="flex border-b border-[#30363d] px-4 overflow-x-auto">
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "code"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("code")}
          >
            <Code2 className="h-4 w-4" />
            Code
          </Button>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "pull-requests"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("pull-requests")}
          >
            <GitPullRequest className="h-4 w-4" />
            Pull Requests
          </Button>

          {/* Nueva pestaña Issues */}
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "issues"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("issues")}
          >
            <AlertCircle className="h-4 w-4" />
            Issues
          </Button>
          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "security"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("security")}
          >
            <Shield className="h-4 w-4" />
            Security
          </Button>

          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "insights"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("insights")}
          >
            <FileText className="h-4 w-4" />
            Insights
          </Button>

          <Button
            variant="ghost"
            className={`flex items-center gap-2 px-3 py-2 h-auto rounded-none ${
              activeSection === "agents"
                ? "border-b-2 border-[#f78166]"
                : "text-gray-300 hover:bg-[#30363d]"
            }`}
            onClick={() => onSectionChange("agents")}
          >
            <Bot className="h-4 w-4" />
            Agents
          </Button>
        </nav>
      )}
    </header>
  );
}
