"use client";

import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { Bot } from "lucide-react";

export function AgentsSection({ repository }: { repository: Repository }) {
  return (
    <SectionCard icon={Bot} title={`AI Agents - ${repository.full_name}`}>
      <div className="space-y-6">
        <div className="p-4 bg-[#0d1117] rounded-lg border border-[#30363d]">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">
            Available Agents
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-[#161b22] rounded-lg">
              <Bot className="h-5 w-5 text-blue-400 mt-1" />
              <div>
                <h4 className="text-sm font-medium text-gray-200">
                  Code Analysis Agent
                </h4>
                <p className="text-sm text-gray-400">
                  Analyzes code for patterns, bugs, and potential improvements
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-[#161b22] rounded-lg">
              <Bot className="h-5 w-5 text-green-400 mt-1" />
              <div>
                <h4 className="text-sm font-medium text-gray-200">
                  Documentation Agent
                </h4>
                <p className="text-sm text-gray-400">
                  Generates and improves code documentation
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-[#161b22] rounded-lg">
              <Bot className="h-5 w-5 text-purple-400 mt-1" />
              <div>
                <h4 className="text-sm font-medium text-gray-200">
                  Security Agent
                </h4>
                <p className="text-sm text-gray-400">
                  Identifies security vulnerabilities and suggests fixes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
