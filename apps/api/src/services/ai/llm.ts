// SitePilot AI — LLM Provider Abstraction
// Model-agnostic interface with OpenAI provider implementation.

import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

// ---- Types ----

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

export interface LLMToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  orgId?: string;
}

export interface LLMCallResult {
  message: LLMMessage;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface LLMProvider {
  chat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    options?: LLMCallOptions,
  ): Promise<LLMCallResult>;
  chatStream(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    options?: LLMCallOptions,
  ): AsyncGenerator<string, LLMCallResult, unknown>;
}

// ---- OpenAI Provider ----

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config?: { apiKey?: string; baseURL?: string; model?: string }) {
    this.client = new OpenAI({
      apiKey: config?.apiKey ?? process.env.OPENAI_API_KEY ?? "",
      baseURL: config?.baseURL ?? process.env.OPENAI_BASE_URL ?? undefined,
    });
    this.defaultModel = config?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  }

  private toOpenAIMessages(messages: LLMMessage[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      const m = {
        role: msg.role as ChatCompletionMessageParam["role"],
        content: msg.content,
      } as Record<string, unknown>;

      if (msg.name && (msg.role === "user" || msg.role === "assistant")) {
        m.name = msg.name;
      }

      if (msg.tool_calls && msg.role === "assistant") {
        m.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }

      if (msg.role === "tool" && msg.toolCallId) {
        m.tool_call_id = msg.toolCallId;
      }

      return m as unknown as ChatCompletionMessageParam;
    });
  }

  private toOpenAITools(tools: LLMToolDefinition[]): ChatCompletionTool[] {
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      },
    }));
  }

  private fromOpenAIMessage(
    msg: OpenAI.Chat.Completions.ChatCompletionMessage,
  ): LLMMessage {
    const result: LLMMessage = {
      role: (msg.role as LLMMessage["role"]) ?? "assistant",
      content: msg.content ?? "",
    };

    if (msg.tool_calls) {
      result.tool_calls = msg.tool_calls.map((tc) => {
        const fn = (tc as { function?: { name: string; arguments: string } }).function;
        return {
          id: tc.id,
          type: "function" as const,
          function: {
            name: fn?.name ?? "",
            arguments: fn?.arguments ?? "",
          },
        };
      });
    }

    return result;
  }

  async chat(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    options?: LLMCallOptions,
  ): Promise<LLMCallResult> {
    const startTime = Date.now();

    const response = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages: this.toOpenAIMessages(messages),
      tools: tools ? this.toOpenAITools(tools) : undefined,
      tool_choice: tools ? "auto" : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      stream: false,
    });

    const latencyMs = Date.now() - startTime;
    const choice = response.choices[0];

    return {
      message: choice ? this.fromOpenAIMessage(choice.message) : { role: "assistant", content: "" },
      finishReason: choice?.finish_reason ?? "stop",
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      latencyMs,
    };
  }

  async *chatStream(
    messages: LLMMessage[],
    tools?: LLMToolDefinition[],
    options?: LLMCallOptions,
  ): AsyncGenerator<string, LLMCallResult, unknown> {
    const startTime = Date.now();
    let content = "";
    let finishReason = "stop";
    const toolCallsMap = new Map<number, { id: string; function: { name: string; arguments: string } }>();

    const stream = await this.client.chat.completions.create({
      model: options?.model ?? this.defaultModel,
      messages: this.toOpenAIMessages(messages),
      tools: tools ? this.toOpenAITools(tools) : undefined,
      tool_choice: tools ? "auto" : undefined,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 1024,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        content += delta.content;
        yield delta.content;
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap.has(idx)) {
            toolCallsMap.set(idx, {
              id: tc.id ?? "",
              function: { name: tc.function?.name ?? "", arguments: "" },
            });
          }
          if (tc.function?.arguments) {
            const existing = toolCallsMap.get(idx)!;
            existing.function.arguments += tc.function.arguments;
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }
    }

    const latencyMs = Date.now() - startTime;
    const rawToolCalls = toolCallsMap.size > 0
      ? Array.from(toolCallsMap.values())
      : undefined;

    const toolCalls = rawToolCalls?.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: tc.function,
    }));

    const finalMessage: LLMMessage = {
      role: "assistant",
      content,
      ...(toolCalls ? { tool_calls: toolCalls } : {}),
    };

    return {
      message: finalMessage,
      finishReason,
      latencyMs,
    };
  }
}

// ---- Factory ----

export interface AIConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

/**
 * Creates an LLM provider based on org AI configuration.
 * Currently only supports OpenAI, but is designed for easy extension
 * to Anthropic, Azure, or other providers.
 */
export function createLLMProvider(config?: AIConfig): LLMProvider {
  const providerName = config?.provider ?? "openai";

  switch (providerName) {
    case "openai":
    default:
      return new OpenAIProvider({
        apiKey: config?.apiKey ?? process.env.OPENAI_API_KEY,
        baseURL: config?.baseUrl ?? process.env.OPENAI_BASE_URL,
        model: config?.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      });
  }
}

// ---- Singleton for convenience ----
let defaultProvider: LLMProvider | null = null;

export function getDefaultLLMProvider(): LLMProvider {
  if (!defaultProvider) {
    defaultProvider = createLLMProvider();
  }
  return defaultProvider;
}
