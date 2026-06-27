/**
 * MCP Server — Wellness Companion Tool Server
 *
 * A Model Context Protocol (MCP) server that exposes 6 wellness tools over
 * stdio transport. This server can be connected to any MCP-compatible client
 * such as Antigravity IDE or Claude Desktop.
 *
 * ## Connecting to Antigravity IDE
 *
 * Add this to your Antigravity MCP configuration:
 * ```json
 * {
 *   "mcpServers": {
 *     "wellness-companion": {
 *       "command": "npx",
 *       "args": ["ts-node", "src/mcp/server.ts"],
 *       "cwd": "/path/to/wellness-companion"
 *     }
 *   }
 * }
 * ```
 *
 * ## Connecting to Claude Desktop
 *
 * Add this to your Claude Desktop config (~/Library/Application Support/Claude/claude_desktop_config.json):
 * ```json
 * {
 *   "mcpServers": {
 *     "wellness-companion": {
 *       "command": "npx",
 *       "args": ["ts-node", "src/mcp/server.ts"],
 *       "cwd": "/path/to/wellness-companion"
 *     }
 *   }
 * }
 * ```
 *
 * ## Available Tools
 *
 * 1. start_checkin     — Start or continue a wellness check-in conversation
 * 2. get_recent_checkins — View recent check-in history
 * 3. get_patterns      — View latest mood pattern analysis
 * 4. get_todays_nudge  — Generate personalized wellness nudges
 * 5. get_checkin_status — Check today's check-in status
 * 6. get_mood_summary  — Get mood statistics for the past week
 *
 * @module mcp/server
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { handleCheckinTurn, hasCheckedInToday } from "../agents/orchestrator";
import {
  getRecentCheckIns,
  getCheckInCount,
  getTodaysCheckIn,
  getLatestPattern,
} from "../agents/memory-agent";
import { runPatternAndNudgePipeline } from "../agents/wellness-agents";
import {
  sanitizeInput,
  detectCrisisLanguage,
  getCrisisResponse,
} from "../middleware/security";
import type { ConversationTurn } from "../agents/base-agent";

// ---------------------------------------------------------------------------
// Server Setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "wellness-companion", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_checkin",
        description:
          "Start or continue a daily wellness check-in conversation. The check-in agent will conduct an empathetic multi-turn conversation to gather mood, energy, and other wellness data.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
            message: {
              type: "string",
              description: "The user's message in the check-in conversation",
            },
            history: {
              type: "array",
              description:
                "Previous conversation turns (array of {role, parts} objects)",
              items: {
                type: "object",
                properties: {
                  role: {
                    type: "string",
                    enum: ["user", "model"],
                  },
                  parts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ["userId", "message"],
        },
      },
      {
        name: "get_recent_checkins",
        description:
          "Retrieve recent wellness check-ins for a user. Returns simplified check-in objects with date, mood, energy, sleep, summary, and tags.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
            days: {
              type: "number",
              description:
                "Number of days to look back (default 14, max 30)",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "get_patterns",
        description:
          "Get the latest mood pattern analysis for a user. Returns trend, insights, and a summary of their wellness patterns.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "get_todays_nudge",
        description:
          "Generate personalized wellness nudges for a user based on their patterns and recent data.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
            currentMood: {
              type: "number",
              description: "Current mood score (1-10), optional",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "get_checkin_status",
        description:
          "Check whether a user has already completed their daily check-in today.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
          },
          required: ["userId"],
        },
      },
      {
        name: "get_mood_summary",
        description:
          "Get a statistical mood summary for the past 7 days, including weekly average, trend, check-in count, highest and lowest moods.",
        inputSchema: {
          type: "object" as const,
          properties: {
            userId: {
              type: "string",
              description: "Unique identifier for the user",
            },
          },
          required: ["userId"],
        },
      },
    ],
  };
});

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // -----------------------------------------------------------------------
      // Tool 1: start_checkin
      // -----------------------------------------------------------------------
      case "start_checkin": {
        const userId = String(args?.userId ?? "");
        const rawMessage = String(args?.message ?? "");
        const history = (args?.history ?? []) as ConversationTurn[];

        if (!userId || !rawMessage) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: "userId and message are required",
                }),
              },
            ],
          };
        }

        // Sanitize input
        const message = sanitizeInput(rawMessage);

        // Crisis detection
        if (detectCrisisLanguage(message)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  reply: getCrisisResponse(),
                  isComplete: false,
                  isCrisis: true,
                }),
              },
            ],
          };
        }

        // Check if already checked in today (only on first turn)
        if (history.length === 0) {
          const alreadyCheckedIn = await hasCheckedInToday(userId);
          if (alreadyCheckedIn) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    reply:
                      "You've already completed your check-in today! Come back tomorrow for another one. 🌟",
                    isComplete: true,
                  }),
                },
              ],
            };
          }
        }

        // Run check-in turn through the orchestrator
        const result = await handleCheckinTurn(userId, message, history);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                reply: result.reply,
                isComplete: result.isComplete,
                moodScore: result.checkIn?.moodScore,
                nudges: result.nudges,
              }),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      // Tool 2: get_recent_checkins
      // -----------------------------------------------------------------------
      case "get_recent_checkins": {
        const userId = String(args?.userId ?? "");
        const days = Math.min(Number(args?.days ?? 14), 30);

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "userId is required" }),
              },
            ],
          };
        }

        const checkIns = await getRecentCheckIns(userId, days);
        const simplified = checkIns.map((ci) => ({
          date: ci.createdAt.toISOString().split("T")[0],
          mood: ci.moodScore,
          energy: ci.energy,
          sleep: ci.sleep,
          summary: ci.summary,
          tags: ci.tags,
        }));

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(simplified) },
          ],
        };
      }

      // -----------------------------------------------------------------------
      // Tool 3: get_patterns
      // -----------------------------------------------------------------------
      case "get_patterns": {
        const userId = String(args?.userId ?? "");

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "userId is required" }),
              },
            ],
          };
        }

        const pattern = await getLatestPattern(userId);

        if (!pattern) {
          const count = await getCheckInCount(userId);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  message: `You have ${count} check-in(s). Complete at least 5 check-ins to unlock pattern analysis.`,
                  checkInsCompleted: count,
                  checkInsNeeded: Math.max(0, 5 - count),
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                moodTrend: pattern.moodTrend,
                summary: pattern.summary,
                insights: pattern.insights,
                entryCount: pattern.entryCount,
                weekStart: pattern.weekStart.toISOString().split("T")[0],
              }),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      // Tool 4: get_todays_nudge
      // -----------------------------------------------------------------------
      case "get_todays_nudge": {
        const userId = String(args?.userId ?? "");
        const currentMood = Number(args?.currentMood ?? 5);

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "userId is required" }),
              },
            ],
          };
        }

        const count = await getCheckInCount(userId);
        if (count < 5) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  message: `Complete at least 5 check-ins to get personalized nudges. You have ${count} so far.`,
                }),
              },
            ],
          };
        }

        const result = await runPatternAndNudgePipeline(userId, currentMood);

        return {
          content: [
            { type: "text" as const, text: JSON.stringify(result) },
          ],
        };
      }

      // -----------------------------------------------------------------------
      // Tool 5: get_checkin_status
      // -----------------------------------------------------------------------
      case "get_checkin_status": {
        const userId = String(args?.userId ?? "");

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "userId is required" }),
              },
            ],
          };
        }

        const todaysCheckIn = await getTodaysCheckIn(userId);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                checkedInToday: todaysCheckIn !== null,
                todaysMood: todaysCheckIn?.moodScore ?? null,
                todaysEnergy: todaysCheckIn?.energy ?? null,
              }),
            },
          ],
        };
      }

      // -----------------------------------------------------------------------
      // Tool 6: get_mood_summary
      // -----------------------------------------------------------------------
      case "get_mood_summary": {
        const userId = String(args?.userId ?? "");

        if (!userId) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ error: "userId is required" }),
              },
            ],
          };
        }

        const checkIns = await getRecentCheckIns(userId, 7);

        if (checkIns.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  message:
                    "No check-ins found in the past 7 days. Start a check-in to begin tracking your mood!",
                }),
              },
            ],
          };
        }

        const moods = checkIns.map((ci) => ci.moodScore);
        const weeklyAverage =
          Math.round(
            (moods.reduce((sum, m) => sum + m, 0) / moods.length) * 10
          ) / 10;
        const highestMood = Math.max(...moods);
        const lowestMood = Math.min(...moods);

        // Determine trend from first half vs second half
        const mid = Math.floor(moods.length / 2);
        const firstHalf = moods.slice(0, mid || 1);
        const secondHalf = moods.slice(mid || 1);
        const firstAvg =
          firstHalf.reduce((s, m) => s + m, 0) / firstHalf.length;
        const secondAvg =
          secondHalf.reduce((s, m) => s + m, 0) / secondHalf.length;
        const diff = secondAvg - firstAvg;

        let trend: string;
        if (diff > 1) trend = "improving";
        else if (diff < -1) trend = "declining";
        else trend = "stable";

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                weeklyAverage,
                trend,
                checkInCount: checkIns.length,
                highestMood,
                lowestMood,
              }),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: message }),
        },
      ],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Wellness Companion MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
