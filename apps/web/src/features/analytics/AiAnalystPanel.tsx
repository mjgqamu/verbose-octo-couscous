// SitePilot AI — AI Analyst Panel
// Chat-like panel embedded in the analytics dashboard for asking business questions.
// Uses the business-analyst API endpoint for live data-driven answers.

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";

// ---- Types ----

interface AnalystMessage {
  role: "user" | "analyst";
  content: string;
  dataUsed?: string[];
}

interface AnalystResponse {
  answer: string;
  dataUsed: string[];
}

// ---- Suggestion Chips ----

const SUGGESTIONS = [
  "How many leads did we get this month?",
  "What's my conversion rate?",
  "Which lead source brings the most business?",
  "How much revenue did we make?",
  "Are we missing too many calls?",
  "How is the AI receptionist performing?",
];

// ---- Component ----

export function AiAnalystPanel() {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [messages, setMessages] = useState<AnalystMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading || !user) return;

      setInput("");
      setError(null);

      // Add user message
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setIsLoading(true);

      try {
        const res = await api.post<{ data: AnalystResponse }>(`/api/v1/orgs/${user.orgId}/ai-analyst/ask`, {
          question: trimmed,
        });

        if (res.data?.data) {
          setMessages((prev) => [
            ...prev,
            {
              role: "analyst",
              content: res.data!.data.answer,
              dataUsed: res.data!.data.dataUsed,
            },
          ]);
        } else if (res.error) {
          setError(res.error.message);
        }
      } catch {
        setError("Failed to connect to AI analyst. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, user],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend(input);
      }
    },
    [handleSend, input],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900">AI Business Analyst</h2>
            <p className="text-xs text-gray-500">Ask questions about your business data</p>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {!isCollapsed && (
        <>
          {/* Suggestions — only show when no messages yet */}
          {messages.length === 0 && (
            <div className="px-5 pb-3">
              <p className="text-xs text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    disabled={isLoading}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-full
                               hover:bg-blue-50 hover:text-blue-700 transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="px-5 max-h-64 overflow-y-auto space-y-3 pb-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900 border border-blue-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

                  {/* Data source badges */}
                  {msg.dataUsed && msg.dataUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-blue-200/50">
                      {msg.dataUsed.map((ds) => (
                        <span
                          key={ds}
                          className="inline-block px-1.5 py-0.5 text-[10px] font-medium rounded
                                     bg-blue-100 text-blue-700"
                        >
                          {ds}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg px-4 py-2 border border-blue-100">
                  <div className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto p-0.5 text-red-400 hover:text-red-600"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-3 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your business..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           outline-none disabled:opacity-50 disabled:cursor-not-allowed
                           placeholder:text-gray-400"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isLoading}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700
                           disabled:opacity-50 disabled:cursor-not-allowed transition"
                aria-label="Ask AI analyst"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
