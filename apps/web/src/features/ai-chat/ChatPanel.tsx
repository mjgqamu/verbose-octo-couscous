// SitePilot AI — Chat Panel
// Reusable chat panel for AI receptionist conversations.
// Used by ChatWidget (floating) and can be embedded in dashboard.

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";

// ---- Types ----

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (message: string) => Promise<void>;
  isLoading: boolean;
  title?: string;
  placeholder?: string;
  className?: string;
}

// ---- Component ----

export function ChatPanel({
  messages,
  onSend,
  isLoading,
  title = "Chat with us",
  placeholder = "Type your message...",
  className = "",
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    setInput("");
    await onSend(trimmed);

    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [input, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      {title && (
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            <p>👋 Hello! How can we help you today?</p>
            <p className="text-xs mt-1">Ask us anything — we're here to help.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : msg.role === "system"
                    ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                    : "bg-gray-100 text-gray-900"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       outline-none disabled:opacity-50 disabled:cursor-not-allowed
                       placeholder:text-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700
                       disabled:opacity-50 disabled:cursor-not-allowed transition"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
