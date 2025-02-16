// components/insights-section.tsx
import { FileText } from "lucide-react";

export function InsightsSection({
  selectedRepo,
}: {
  selectedRepo: string | null;
}) {
  return (
    <div className="max-w-4xl p-4 bg-[#161b22] rounded-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <FileText className="h-5 w-5" /> Repository Insights
      </h2>
      {selectedRepo ? (
        <div className="space-y-4">
          <p>Analytics for: {selectedRepo}</p>
          <div className="p-4 bg-[#0d1117] rounded">
            <p>Commit activity graph</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Select a repository to view insights</p>
      )}
    </div>
  );
}
