"use client";

import { MessageCircle } from 'lucide-react';

interface ChatToggleButtonProps {
  action: string;
}

export function ChatToggleButton({ action }: ChatToggleButtonProps) {
  return (
    <button
      data-action={action}
      className="fixed bottom-4 right-4 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 z-50"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}