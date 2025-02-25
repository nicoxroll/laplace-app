import { ChatHeaderProps } from "@/types/chat";
import { Maximize2, Minimize2, X } from "lucide-react";

export function ChatHeader({ isExpanded, onExpand, onClose }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
      <h2 className="text-sm font-medium text-gray-200">Repository Chat</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={onExpand}
          className="p-1 text-gray-400 hover:text-gray-300"
        >
          {isExpanded ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}