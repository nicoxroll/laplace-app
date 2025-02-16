// components/security-section.tsx
import { Shield } from "lucide-react";

export function SecuritySection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  return (
    <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5" /> Security Overview
      </h2>
      {selectedRepo ? (
        <div className="space-y-4">
          <p>Security analysis for: {selectedRepo}</p>
          <div className="p-4 bg-[#0d1117] rounded">
            <p>Vulnerability scanning results</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">
          Select a repository to view security details
        </p>
      )}
    </div>
  );
}
