import { Message } from "@/types/chat";
import { RepositoryContext } from "@/types/repository";
import { MessageRenderer } from "./message-renderer";

interface ChatMessageProps {
  message: Message;
  context: RepositoryContext | null;
}

export function ChatMessage({ message, context }: ChatMessageProps) {
  return (
    <div
      className={`p-3 mb-3 rounded-lg ${
        message.role === "user" ? "bg-[#1f6feb] ml-6" : "bg-[#161b22] mr-6"
      }`}
    >
      <div className="text-sm prose prose-invert max-w-none">
        {message.role === "assistant" && context && (
          <div className="text-xs text-gray-400 mb-2 flex flex-col gap-1">
            <div>Repository: {context.repository.full_name}</div>
            {context.currentFile && (
              <div>Current File: {context.currentFile.path}</div>
            )}
          </div>
        )}
        <MessageRenderer content={message.content} />
      </div>
    </div>
  );
}
