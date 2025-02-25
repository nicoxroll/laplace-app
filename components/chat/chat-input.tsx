import { ChatInputProps } from "@/types/chat";
import { Send, StopCircle } from "lucide-react";

export function ChatInput({
  input,
  loading,
  onInputChange,
  onSubmit,
  onStop,
}: ChatInputProps) {
  return (
    <form onSubmit={onSubmit} className="p-4 border-t border-[#30363d]">
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={onInputChange}
          placeholder="Ask about the repository..."
          className="w-full p-2 pr-24 bg-[#161b22] text-gray-200 rounded-lg border border-[#30363d] focus:outline-none focus:border-blue-500"
          disabled={loading}
        />
        <div className="absolute right-2 top-2 flex items-center gap-2">
          {loading && (
            <button
              type="button"
              onClick={onStop}
              className="p-1 text-gray-400 hover:text-gray-300"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-1 text-gray-400 hover:text-gray-300 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
