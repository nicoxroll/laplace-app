"use client";

import { CodeViewer } from "./code-viewer";
import type { Repository } from "@/types/repository";

interface CodeSectionProps {
  repository: Repository;
}

export function CodeSection({ repository }: CodeSectionProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-[#161b22] rounded-lg border border-[#30363d] h-[calc(100vh-8rem)]">
        <CodeViewer />
      </div>
    </div>
  );
}
