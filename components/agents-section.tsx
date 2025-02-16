// components/agents-section.tsx
import { Bot } from "lucide-react";

export function AgentsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  return (
    <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Bot className="h-5 w-5" /> AI Agents
      </h2>
      {selectedRepo ? (
        <div className="space-y-4">
          <p>AI tools for: {selectedRepo}</p>
          <div className="p-4 bg-[#0d1117] rounded">
            <p>Code generation assistant</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Select a repository to use AI agents</p>
      )}
    </div>
  );
}
