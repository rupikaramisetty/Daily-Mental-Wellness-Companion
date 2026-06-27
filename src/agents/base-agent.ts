/**
 * ADK-Style Base Agent
 *
 * Foundation class for all agents in the multi-agent wellness companion system.
 * Wraps Google Gemini 2.0 Flash with tool-calling support, conversation history,
 * and structured JSON output mode.
 *
 * Each specialized agent (check-in, extraction, pattern, nudge) extends this
 * base by configuring its own system instructions, temperature, and tools.
 *
 * @module agents/base-agent
 */

import {
  GoogleGenerativeAI,
  type FunctionDeclaration,
  type Content,
  type Part,
} from "@google/generative-ai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A tool that can be registered with a BaseAgent.
 * Contains a Gemini FunctionDeclaration for the model to discover,
 * and an execute function that runs when the model calls it.
 */
export interface AgentTool {
  declaration: FunctionDeclaration;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * A single turn in a conversation, compatible with Gemini's Content format.
 */
export interface ConversationTurn {
  role: "user" | "model";
  parts: { text: string }[];
}

/**
 * Result returned from a single agent run.
 */
export interface AgentRunResult {
  /** The agent's text response */
  text: string;
  /** Names of any tools the agent called during this run */
  toolCalls: string[];
  /** Whether the agent considers its task complete */
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// BaseAgent
// ---------------------------------------------------------------------------

/**
 * ADK-pattern base agent wrapping Google Gemini 2.0 Flash.
 *
 * Provides two execution modes:
 * - `run()` — multi-turn chat with optional tool calling
 * - `runJSON<T>()` — single-shot structured JSON output
 */
export class BaseAgent {
  readonly name: string;
  readonly description: string;
  private readonly instructions: string;
  private readonly tools: AgentTool[];
  private readonly temperature: number;
  private readonly jsonMode: boolean;

  constructor(config: {
    name: string;
    description: string;
    instructions: string;
    tools?: AgentTool[];
    temperature?: number;
    jsonMode?: boolean;
  }) {
    this.name = config.name;
    this.description = config.description;
    this.instructions = config.instructions;
    this.tools = config.tools ?? [];
    this.temperature = config.temperature ?? 0.7;
    this.jsonMode = config.jsonMode ?? false;
  }

  /**
   * Run the agent in multi-turn chat mode.
   * Sends the user message with conversation history, executes any tool calls
   * the model requests, and returns the final text response.
   *
   * @param userMessage - The latest user message
   * @param history     - Prior conversation turns
   * @returns AgentRunResult with text, tool call names, and completion flag
   */
  async run(
    userMessage: string,
    history: ConversationTurn[] = []
  ): Promise<AgentRunResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const toolDeclarations = this.tools.map((t) => t.declaration);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: this.instructions,
      generationConfig: {
        temperature: this.temperature,
      },
      ...(toolDeclarations.length > 0
        ? { tools: [{ functionDeclarations: toolDeclarations }] }
        : {}),
    });

    const geminiHistory: Content[] = history.map((turn) => ({
      role: turn.role,
      parts: turn.parts as Part[],
    }));

    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(userMessage);

    const toolCalls: string[] = [];
    let response = result.response;

    // Handle tool calls iteratively
    let functionCalls = response.functionCalls();
    while (functionCalls && functionCalls.length > 0) {
      const toolResults: { functionResponse: { name: string; response: unknown } }[] = [];

      for (const fc of functionCalls) {
        toolCalls.push(fc.name);
        const tool = this.tools.find(
          (t) => t.declaration.name === fc.name
        );
        if (tool) {
          const output = await tool.execute(
            (fc.args as Record<string, unknown>) ?? {}
          );
          toolResults.push({
            functionResponse: { name: fc.name, response: output },
          });
        } else {
          toolResults.push({
            functionResponse: {
              name: fc.name,
              response: { error: `Unknown tool: ${fc.name}` },
            },
          });
        }
      }

      const followUp = await chat.sendMessage(toolResults as unknown as Part[]);
      response = followUp.response;
      functionCalls = response.functionCalls();
    }

    const text = response.text() ?? "";

    return {
      text,
      toolCalls,
      isComplete: text.includes("[CHECK-IN COMPLETE]"),
    };
  }

  /**
   * Run the agent in single-shot JSON output mode.
   * Sends a prompt and expects a structured JSON response matching type T.
   *
   * @param userMessage - The prompt to send
   * @returns Parsed JSON response of type T
   */
  async runJSON<T>(userMessage: string): Promise<T> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: this.instructions,
      generationConfig: {
        temperature: this.temperature,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    return JSON.parse(text) as T;
  }
}
