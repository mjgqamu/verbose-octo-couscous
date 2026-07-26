// SitePilot AI — Conversation Memory Manager
// Handles storing and retrieving conversation history, with automatic
// summarization when conversations grow too long.

import { db, schema, eq } from "@sitepilot/db";
import type { LLMMessage } from "./llm.js";
import { getDefaultLLMProvider } from "./llm.js";

// ---- Constants ----

const MAX_MESSAGES = 30;
const SUMMARIZE_THRESHOLD = 30;
const KEEP_LAST = 15;

// ---- Helpers ----

function dbMessageToLLMMessage(msg: typeof schema.messages.$inferSelect): LLMMessage {
  const metadata = (msg.metadata as Record<string, unknown>) ?? {};

  const llmMsg: LLMMessage = {
    role: (msg.role as LLMMessage["role"]) || "user",
    content: msg.content,
  };

  if (metadata.toolCallId) {
    llmMsg.toolCallId = metadata.toolCallId as string;
  }

  if (metadata.toolCalls) {
    llmMsg.tool_calls = metadata.toolCalls as LLMMessage["tool_calls"];
  }

  if (metadata.name) {
    llmMsg.name = metadata.name as string;
  }

  // Map db roles to LLM roles
  if (msg.role === "human") {
    llmMsg.role = "user";
  } else if (msg.role === "ai") {
    llmMsg.role = "assistant";
  } else if (msg.role === "system") {
    llmMsg.role = "system";
  }

  return llmMsg;
}

function llmRoleToDbRole(role: LLMMessage["role"]): string {
  switch (role) {
    case "user":
      return "human";
    case "assistant":
      return "ai";
    case "tool":
      return "system";
    case "system":
      return "system";
    default:
      return "human";
  }
}

function buildMessageMetadata(msg: LLMMessage): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {};

  if (msg.toolCallId) {
    metadata.toolCallId = msg.toolCallId;
  }
  if (msg.tool_calls) {
    metadata.toolCalls = msg.tool_calls;
  }
  if (msg.name) {
    metadata.name = msg.name;
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

// ---- Memory Manager ----

/**
 * Retrieves conversation history as LLM-formatted messages.
 */
export async function getHistory(conversationId: string): Promise<LLMMessage[]> {
  const messages = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(schema.messages.createdAt)
    .limit(MAX_MESSAGES * 2);

  return messages.map(dbMessageToLLMMessage);
}

/**
 * Stores a message in the database and updates conversation metadata.
 */
export async function addMessage(
  conversationId: string,
  orgId: string,
  message: LLMMessage,
): Promise<void> {
  const dbRole = llmRoleToDbRole(message.role);
  const metadata = buildMessageMetadata(message);

  await db.insert(schema.messages).values({
    orgId,
    conversationId,
    role: dbRole,
    content: message.content,
    metadata,
  });

  // Update conversation metadata
  const [convo] = await db
    .select({
      id: schema.conversations.id,
      count: schema.conversations.messageCount,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, conversationId))
    .limit(1);

  if (convo) {
    await db
      .update(schema.conversations)
      .set({
        lastMessageAt: new Date(),
        messageCount: (convo.count ?? 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.conversations.id, conversationId));
  }
}

/**
 * If messages exceed the threshold, compress the oldest messages into
 * a summary and return a shortened list.
 */
export async function summarizeIfNeeded(messages: LLMMessage[]): Promise<LLMMessage[]> {
  if (messages.length <= SUMMARIZE_THRESHOLD) {
    return messages;
  }

  // Split: first chunk to summarize, last KEEP_LAST to keep verbatim
  const toSummarize = messages.slice(0, messages.length - KEEP_LAST);
  const keepVerbatim = messages.slice(-KEEP_LAST);

  // Generate a summary using the LLM
  try {
    const llm = getDefaultLLMProvider();
    const summaryResult = await llm.chat([
      {
        role: "system",
        content:
          "You are a conversation summarizer. Summarize the following conversation briefly, preserving key information: customer name, contact details, service needs, any decisions made, and any pending actions. Keep it under 300 words.",
      },
      {
        role: "user",
        content: toSummarize
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n"),
      },
    ]);

    const summaryText = summaryResult.message.content || "Previous conversation summarized.";

    // Return: summary as a system message + recent messages
    return [
      {
        role: "system",
        content: `[Previous conversation summary]: ${summaryText}`,
      },
      ...keepVerbatim,
    ];
  } catch {
    // If summarization fails, just truncate
    return keepVerbatim;
  }
}
