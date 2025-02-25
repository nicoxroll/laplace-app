"use client";

import { SectionCard } from "@/components/ui/section-card";
import type { Repository } from "@/types/repository";
import { CodeViewer } from "./code-viewer";

interface CodeSectionProps {
  repository: Repository;
}

export function CodeSection({ repository }: CodeSectionProps) {
  return (
    <SectionCard>
      <div className="h-[calc(100vh-12rem)]">
        <CodeViewer />
      </div>
    </SectionCard>
  );
}
