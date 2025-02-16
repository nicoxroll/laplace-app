"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";

interface CodeViewerProps {
  content: string[];
  language?: string;
  showLineNumbers?: boolean;
}

export function CodeViewer({
  content,
  language = "yaml",
  showLineNumbers = true,
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-md border border-[#30363d] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-300">
            3 lines (3 loc) · 38 Bytes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-[#30363d] text-gray-300"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-[#30363d] text-gray-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <tbody className="font-mono text-sm">
            {content.map((line, index) => (
              <tr key={index} className="hover:bg-[#1c2128]">
                <td className="py-[1px] pl-4 pr-2 select-none text-right text-gray-500 w-12 border-r border-[#30363d]">
                  {index + 1}
                </td>
                <td className="py-[1px] pl-4 pr-4 whitespace-pre text-[#7ee787]">
                  {line}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
