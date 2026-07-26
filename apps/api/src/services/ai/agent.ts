// SitePilot AI — Receptionist Agent
// The core AI agent that handles chat conversations with tool-calling capability.

import type { LLMMessage, LLMToolDefinition } from "./llm.js";
import { getDefaultLLMProvider } from "./llm.js";
import { ToolExecutor, ALL_RECEPTIONIST_TOOLS } from "./tools.js";
import type { ToolExecutionContext } from "./tools.js";

// ---- Types ----

export interface OrgAIConfig {
  businessName?: string;
  businessHours?: Record<string, unknown>;
  services?: string[];
  personality?: {
    tone?: string;
    greeting?: string;
    role?: string;
  };
  systemPrompt?: string;
  model?: string;
}

export interface AgentChatResult {
  reply: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>;
}

// ---- Receptionist Agent ----

const MAX_TOOL_ROUNDS = 3;

export class ReceptionistAgent {
  private orgConfig: OrgAIConfig;
  private toolExecutor: ToolExecutor;
  private tools: LLMToolDefinition[];

  constructor(_orgId: string, orgConfig: OrgAIConfig, context: ToolExecutionContext) {
    this.orgConfig = orgConfig;
    this.toolExecutor = new ToolExecutor(context);
    this.tools = ALL_RECEPTIONIST_TOOLS;
  }

  /**
   * Builds the system prompt for the AI receptionist using org configuration.
   */
  private buildSystemPrompt(): string {
    const businessName = this.orgConfig.businessName || "our business";
    const tone = this.orgConfig.personality?.tone || "friendly and professional";
    const greeting = this.orgConfig.personality?.greeting || "Hello! How can we help you today?";

    let servicesList = "";
    if (this.orgConfig.services && this.orgConfig.services.length > 0) {
      servicesList = this.orgConfig.services.join(", ");
    } else {
      servicesList = "various home and commercial services";
    }

    let hoursInfo = "";
    if (this.orgConfig.businessHours) {
      const bh = this.orgConfig.businessHours as Record<string, string>;
      const dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const hourLines = dayNames
        .filter((d) => bh[d])
        .map((d) => `${d.charAt(0).toUpperCase() + d.slice(1)}: ${bh[d]}`);
      if (hourLines.length > 0) {
        hoursInfo = "\n\nBusiness Hours:\n" + hourLines.join("\n");
      }
    }

    const basePrompt = `You are an AI receptionist for ${businessName}, a field service business that provides ${servicesList}. You are ${tone}.

Your primary goal is to understand what the customer needs and help them effectively. Follow these guidelines:

1. **Be helpful and warm**: Greet customers warmly. Listen carefully to their needs.
2. **Collect information naturally**: Ask for details one at a time rather than overwhelming with questions. Key info to gather: name, phone, email, address, service needed, and urgency.
3. **Never invent pricing or timelines**: If a customer asks about pricing, say you'll need to have the team provide a quote. Do not make up prices, availability guarantees, or specific arrival times.
4. **Use your tools**: When you have enough information, use the appropriate tool (create_lead, check_availability, book_appointment, search_knowledge). Don't just describe what you'll do — actually do it.
5. **Escalate when needed**: If the customer seems confused, frustrated, asks for a human, or has a complex request you can't handle, use escalate_to_human.
6. **Stay in character**: You are a helpful receptionist, not a chatbot. Use natural conversational language.
7. **Be concise**: Keep responses clear and to the point. Don't ramble.
8. **When booking**: Always confirm the key details (name, service, date/time preference) before booking.
${hoursInfo}
Remember: You represent ${businessName}. Every interaction should leave the customer feeling valued and well-served.${greeting ? `\n\nYour typical greeting style: "${greeting}"` : ""}`;

    // Allow org-specific system prompt override or augmentation
    if (this.orgConfig.systemPrompt) {
      return `${basePrompt}\n\nAdditional instructions from the business owner:\n${this.orgConfig.systemPrompt}`;
    }

    return basePrompt;
  }

  /**
   * Main chat method — handles a single user message within a conversation.
   */
  async chat(
    message: string,
    conversationHistory: LLMMessage[],
  ): Promise<AgentChatResult> {
    const llm = getDefaultLLMProvider();
    const systemPrompt = this.buildSystemPrompt();

    const toolCallsLog: Array<{ name: string; args: Record<string, unknown>; result?: unknown }> = [];

    // Build the message array
    const messages: LLMMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    try {
      return await this.runWithTools(llm, messages, toolCallsLog, 0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("ReceptionistAgent error:", errorMsg);

      // Return a friendly fallback
      return {
        reply:
          "I'm sorry, I'm having a bit of trouble right now. Could you please try again, or call our team directly for immediate assistance?",
        toolCalls: toolCallsLog,
      };
    }
  }

  private async runWithTools(
    llm: ReturnType<typeof getDefaultLLMProvider>,
    messages: LLMMessage[],
    toolCallsLog: Array<{ name: string; args: Record<string, unknown>; result?: unknown }>,
    round: number,
  ): Promise<AgentChatResult> {
    if (round >= MAX_TOOL_ROUNDS) {
      // Max tool rounds reached — ask LLM for final answer without tools
      const result = await llm.chat(messages);
      return {
        reply: result.message.content || "I've gathered the information I need. A team member will follow up with you shortly.",
        toolCalls: toolCallsLog,
      };
    }

    const result = await llm.chat(messages, this.tools, {
      temperature: 0.7,
      maxTokens: 1024,
    });

    // Check if the LLM called any tools
    const toolCalls = result.message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // No tool calls — just return the reply
      return {
        reply: result.message.content || "Is there anything else I can help you with?",
        toolCalls: toolCallsLog,
      };
    }

    // Execute tools
    const toolResults: Array<{ toolCallId: string; name: string; result: string }> = [];

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      const execResult = await this.toolExecutor.execute(tc.function.name, args);

      toolCallsLog.push({
        name: tc.function.name,
        args,
        result: execResult,
      });

      toolResults.push({
        toolCallId: tc.id,
        name: tc.function.name,
        result: JSON.stringify(execResult),
      });
    }

    // Add assistant message with tool calls to messages
    messages.push(result.message);

    // Add tool result messages
    for (const tr of toolResults) {
      messages.push({
        role: "tool",
        content: tr.result,
        toolCallId: tr.toolCallId,
        name: tr.name,
      });
    }

    // Recursively call LLM with tool results
    return this.runWithTools(llm, messages, toolCallsLog, round + 1);
  }
}
