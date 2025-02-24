"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Download, Maximize, Minimize } from "lucide-react";
import { useState } from "react";
import DOMPurify from "dompurify";

interface CodeViewerProps {
  content: string[];
  fileName?: string;
  filePath?: string;
  imageSrc?: string;
  githubToken?: string;
}

export function CodeViewer({
  content,
  fileName = "",
  filePath = "",
  imageSrc = "",
  githubToken = "",
}: CodeViewerProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const isImage = [".jpg", ".jpeg", ".png", ".gif"].some((ext) =>
    fileName.toLowerCase().endsWith(ext)
  );

  const getImageUrl = () => {
    if (!imageSrc) return "";
    let url = imageSrc;

    if (githubToken) {
      url += url.includes("?") ? "&" : "?";
      url += `access_token=${githubToken}`;
    }

    return DOMPurify.sanitize(url);
  };

  const handleCopy = () => {
    if (isImage) {
      fetch(getImageUrl())
        .then((res) => res.blob())
        .then((blob) => {
          navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          setCopied(true);
        })
        .catch(() => setHasError(true));
    } else {
      navigator.clipboard.writeText(content.join("\n"));
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.download = fileName;

    if (isImage) {
      link.href = getImageUrl();
    } else {
      const blob = new Blob([content.join("\n")], { type: "text/plain" });
      link.href = URL.createObjectURL(blob);
    }

    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div
      className={`rounded-md border border-[#30363d] overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-50 !rounded-none bg-[#0d1117]"
          : "relative max-w-full"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-300">
            {isImage ? (
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">{filePath}</span>
                <span>{fileName}</span>
              </div>
            ) : (
              `${filePath}/${fileName} · ${content.length} lines · ${
                content.join("").length
              } Bytes`
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-[#30363d] text-gray-300"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-[#30363d] text-gray-300"
            onClick={handleCopy}
            disabled={hasError}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 hover:bg-[#30363d] text-gray-300"
            onClick={handleDownload}
            disabled={hasError}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isImage ? (
        <div className="relative h-full bg-black flex items-center justify-center min-h-[300px]">
          <div className="absolute top-2 left-2 text-xs text-gray-400 bg-black/50 p-1 rounded">
            {filePath}/{fileName}
          </div>

          {!isImageLoaded && !hasError && (
            <div className="text-gray-400 animate-pulse">Loading image...</div>
          )}

          <img
            src={getImageUrl()}
            alt={`Preview de ${fileName}`}
            className={`object-contain cursor-zoom-in ${
              isFullscreen ? "max-h-[90vh] w-auto" : "max-h-96 max-w-full"
            } ${!isImageLoaded || hasError ? "hidden" : "block"}`}
            onLoad={() => {
              setIsImageLoaded(true);
              setHasError(false);
            }}
            onError={() => {
              setHasError(true);
              setIsImageLoaded(false);
            }}
          />

          {hasError && (
            <div className="text-red-400 text-center p-4">
              Error loading image: <br />
              <span className="text-xs break-all">{getImageUrl()}</span>
              <button
                className="text-blue-400 hover:underline block mt-2"
                onClick={() => {
                  setHasError(false);
                  setIsImageLoaded(false);
                }}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-auto max-h-[70vh]">
          <table className="w-full border-collapse">
            <tbody className="font-mono text-sm">
              {content.map((line, index) => (
                <tr key={index} className="hover:bg-[#1c2128] group">
                  <td className="py-[1px] pl-4 pr-2 select-none text-right text-gray-500 w-12 border-r border-[#30363d] sticky left-0 bg-[#0d1117]">
                    {index + 1}
                  </td>
                  <td className="py-[1px] pl-4 pr-4 whitespace-pre-wrap break-all text-[#7ee787]">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
