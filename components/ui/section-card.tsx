"use client";

import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface SectionCardProps {
  icon?: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export function SectionCard({
  icon: Icon,
  title,
  children,
  className = "",
  fullHeight = false,
}: SectionCardProps) {
  return (
    <div className="py-4">
      <div
        className={`max-w-6xl mx-auto bg-[#161b22] rounded-lg border border-[#30363d] shadow-xl ${
          fullHeight ? "h-[calc(100vh-8rem)]" : ""
        } ${className}`}
      >
        {(Icon || title) && (
          <div className="p-6 border-b border-[#30363d]">
            <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-200">
              {Icon && <Icon className="h-6 w-6 text-blue-400" />}
              {title}
            </h2>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
