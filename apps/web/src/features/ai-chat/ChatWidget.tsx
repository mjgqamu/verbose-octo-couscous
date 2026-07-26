// SitePilot AI — Chat Widget
// Floating chat button that opens a sliding panel with the AI receptionist.

import { useState, useCallback, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import type { ChatMessage } from "./ChatPanel";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

// ---- Component ----

export function ChatWidget() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const conversationIdRef = useRef<string | null>(null);

  const handleSend = useCallback(
    async (message: string) => {
      if (!isAuthenticated || !user) {
        // For unauthenticated users, show a friendly message
        setMessages((prev) => [
          ...prev,
          { role: "user", content: message },
          {
            role: "assistant",
            content:
              "Hi there! To chat with our AI receptionist, please sign in to your account. You can create a free account in just a minute.",
          },
        ]);
        return;
      }

      // Add user message immediately
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setIsLoading(true);

      try {
        const res = await api.post<{
          reply: string;
          conversationId: string;
          toolCalls: unknown[];
        }>(`/api/v1/orgs/${user.orgId}/ai/chat`, {
          message,
          conversationId: conversationIdRef.current ?? undefined,
          channel: "chat",
        });

        if (res.data) {
          conversationIdRef.current = res.data.conversationId;

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: res.data!.reply,
            },
          ]);
        } else if (res.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `Sorry, I encountered an error: ${res.error!.message}. Please try again.`,
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content:
              "I'm having trouble connecting right now. Please try again in a moment.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, user],
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3
                   bg-blue-600 text-white rounded-full shadow-lg
                   hover:bg-blue-700 transition-all hover:shadow-xl
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Open chat"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">Chat with us</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)]
                 h-[520px] max-h-[calc(100vh-6rem)]
                 bg-white rounded-xl shadow-2xl border border-gray-200
                 flex flex-col overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold text-sm">SitePilot Assistant</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-blue-700 transition"
          aria-label="Close chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat panel */}
      <ChatPanel
        messages={messages}
        onSend={handleSend}
        isLoading={isLoading}
        title=""
        placeholder={isAuthenticated ? "Type your message..." : "Sign in to chat..."}
      />
    </div>
  );
}
