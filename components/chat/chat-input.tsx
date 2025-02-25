import { StopCircle, Send } from "lucide-react";

interface ChatInputProps {
  input: string;
  loading: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
}

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
        {loading ? (
          <div className="w-full pl-3 pr-8 py-2 bg-[#161b22] rounded-lg text-sm text-[#8b949e] flex items-center">
            <div className="dot-flashing mr-2"></div>
            Thinking...
          </div>
        ) : (
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full pl-3 pr-8 py-2 bg-[#161b22] border border-[#30363d] rounded-lg text-sm text-[#c9d1d9] focus:ring-2 focus:ring-[#1f6feb] focus:outline-none"
            placeholder="Ask something..."
            disabled={loading}
          />
        )}
        <button
          type="button"
          onClick={loading ? onStop : onSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#58a6ff] disabled:opacity-50"
          disabled={!input.trim() && !loading}
        >
          {loading ? (
            <StopCircle className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
    </form>
  );
}
