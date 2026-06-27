#!/usr/bin/env ts-node
/**
 * CLI — Wellness Companion Terminal Interface
 *
 * Terminal CLI demonstrating the "Agent Skills" requirement for the
 * Kaggle AI Agents Capstone. Provides interactive multi-turn check-in
 * conversations, pattern insights, nudge generation, and status checks
 * directly from the terminal.
 *
 * Usage:
 *   npx ts-node cli.ts --message "I had a great day"
 *   npx ts-node cli.ts --insights
 *   npx ts-node cli.ts --nudge
 *   npx ts-node cli.ts --status
 *   npx ts-node cli.ts --history
 *
 * @module cli
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as readline from "readline";
import { handleCheckinTurn, hasCheckedInToday } from "./src/agents/orchestrator";
import {
  getRecentCheckIns,
  getCheckInCount,
  getLatestPattern,
} from "./src/agents/memory-agent";
import { runPatternAndNudgePipeline } from "./src/agents/wellness-agents";
import { sanitizeInput, detectCrisisLanguage, getCrisisResponse } from "./src/middleware/security";
import type { ConversationTurn } from "./src/agents/base-agent";

// ---------------------------------------------------------------------------
// ANSI Color Helpers
// ---------------------------------------------------------------------------

const COLORS = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
};

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function printBanner(): void {
  console.log("");
  console.log(COLORS.cyan("╔══════════════════════════════════════════════╗"));
  console.log(COLORS.cyan("║                                              ║"));
  console.log(COLORS.cyan("║   🌿 Daily Wellness Companion CLI            ║"));
  console.log(COLORS.cyan("║   Multi-Agent AI Wellness Check-In           ║"));
  console.log(COLORS.cyan("║                                              ║"));
  console.log(COLORS.cyan("╚══════════════════════════════════════════════╝"));
  console.log("");
  console.log(COLORS.gray("  Kaggle AI Agents Capstone — Agents for Good"));
  console.log(COLORS.gray("  Powered by Gemini 2.0 Flash · 4-Agent Pipeline"));
  console.log("");
}

// ---------------------------------------------------------------------------
// Interactive Readline Helper
// ---------------------------------------------------------------------------

function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/**
 * Run an interactive multi-turn check-in conversation.
 * Continues prompting the user until the check-in agent signals completion.
 */
async function runInteractiveCheckin(
  userId: string,
  initialMessage: string
): Promise<void> {
  console.log(COLORS.gray("Starting check-in conversation...\n"));

  // Check if already checked in today
  const alreadyDone = await hasCheckedInToday(userId);
  if (alreadyDone) {
    console.log(
      COLORS.yellow(
        "You've already completed your check-in today! Come back tomorrow. 🌟"
      )
    );
    return;
  }

  const history: ConversationTurn[] = [];
  let userMessage = sanitizeInput(initialMessage);
  let isComplete = false;

  while (!isComplete) {
    // Crisis detection
    if (detectCrisisLanguage(userMessage)) {
      console.log("\n" + COLORS.red(getCrisisResponse()));
      return;
    }

    console.log(COLORS.gray("  ⏳ Thinking..."));

    const result = await handleCheckinTurn(userId, userMessage, history);

    // Print agent reply
    console.log("");
    console.log(COLORS.cyan("  🤖 Companion: ") + result.reply);
    console.log("");

    // Update history
    history.push({ role: "user", parts: [{ text: userMessage }] });
    history.push({ role: "model", parts: [{ text: result.reply }] });

    if (result.isComplete) {
      isComplete = true;

      // Print extracted data
      if (result.checkIn) {
        console.log(COLORS.green("  ✅ Check-in saved!\n"));
        console.log(COLORS.bold("  📊 Check-in Summary:"));
        console.log(`     Mood:   ${result.checkIn.moodScore}/10`);
        console.log(`     Energy: ${result.checkIn.energy}/10`);
        console.log(
          `     Sleep:  ${result.checkIn.sleep !== null ? result.checkIn.sleep + "h" : "N/A"}`
        );
        console.log(`     Tags:   ${result.checkIn.tags.join(", ")}`);
        console.log("");
      }

      // Print nudges
      if (result.nudges && result.nudges.length > 0) {
        console.log(COLORS.bold("  ✨ Your Personalized Nudges:\n"));
        for (const nudge of result.nudges) {
          const emoji =
            nudge.category === "sleep"
              ? "😴"
              : nudge.category === "exercise"
                ? "🏃"
                : nudge.category === "social"
                  ? "🤝"
                  : nudge.category === "work"
                    ? "💼"
                    : "🧘";
          console.log(COLORS.yellow(`     ${emoji} ${nudge.message}`));
        }
        console.log("");
      }
    } else {
      // Prompt for next message
      const nextInput = await askQuestion(COLORS.magenta("  You: "));
      userMessage = sanitizeInput(nextInput.trim());

      if (!userMessage) {
        console.log(COLORS.gray("  (Empty input — ending conversation)"));
        break;
      }
    }
  }
}

/**
 * Show the user's latest pattern insights from the database.
 */
async function showInsights(userId: string): Promise<void> {
  const pattern = await getLatestPattern(userId);

  if (!pattern) {
    const count = await getCheckInCount(userId);
    console.log(
      COLORS.yellow(
        `No patterns yet. You have ${count} check-in(s). Complete at least 5 to unlock insights.`
      )
    );
    return;
  }

  console.log(COLORS.bold("📈 Latest Pattern Analysis:\n"));
  console.log(`  Mood Trend:  ${pattern.moodTrend}`);
  console.log(`  Summary:     ${pattern.summary}`);
  console.log(`  Entries:     ${pattern.entryCount}`);
  console.log("");

  const insights = pattern.insights as Record<string, string[]>;
  if (insights.triggers?.length) {
    console.log(COLORS.red(`  ⚠️  Triggers: ${insights.triggers.join(", ")}`));
  }
  if (insights.boosters?.length) {
    console.log(
      COLORS.green(`  🚀 Boosters:  ${insights.boosters.join(", ")}`)
    );
  }
  if (insights.correlations?.length) {
    console.log(
      COLORS.cyan(
        `  🔗 Correlations: ${insights.correlations.join(", ")}`
      )
    );
  }
  console.log("");
}

/**
 * Generate and display a personalized nudge.
 */
async function showNudge(userId: string): Promise<void> {
  const count = await getCheckInCount(userId);
  if (count < 5) {
    console.log(
      COLORS.yellow(
        `You need at least 5 check-ins for personalized nudges. You have ${count}.`
      )
    );
    return;
  }

  console.log(COLORS.gray("  Generating personalized nudge...\n"));
  const result = await runPatternAndNudgePipeline(userId, 5);

  if (result.nudges.length === 0) {
    console.log(COLORS.yellow("  No nudges generated. Try again later!"));
    return;
  }

  console.log(COLORS.bold("  ✨ Your Nudges:\n"));
  for (const nudge of result.nudges) {
    const emoji =
      nudge.category === "sleep"
        ? "😴"
        : nudge.category === "exercise"
          ? "🏃"
          : nudge.category === "social"
            ? "🤝"
            : nudge.category === "work"
              ? "💼"
              : "🧘";
    console.log(COLORS.yellow(`     ${emoji} ${nudge.message}`));
  }
  console.log("");
}

/**
 * Show today's check-in status.
 */
async function showStatus(userId: string): Promise<void> {
  const alreadyDone = await hasCheckedInToday(userId);
  const count = await getCheckInCount(userId);

  console.log(COLORS.bold("📋 Check-In Status:\n"));
  console.log(
    `  Today:       ${alreadyDone ? COLORS.green("✅ Checked in") : COLORS.yellow("⏳ Not yet")}`
  );
  console.log(`  Total:       ${count} check-in(s)`);
  console.log(
    `  Insights:    ${count >= 5 ? COLORS.green("Unlocked") : COLORS.yellow(`${5 - count} more needed`)}`
  );
  console.log("");
}

/**
 * Show check-in history for the last 7 days.
 */
async function showHistory(userId: string): Promise<void> {
  const checkIns = await getRecentCheckIns(userId, 7);

  if (checkIns.length === 0) {
    console.log(
      COLORS.yellow("  No check-ins in the past 7 days. Start one today!")
    );
    return;
  }

  console.log(COLORS.bold(`📅 Last 7 Days (${checkIns.length} check-ins):\n`));

  for (const ci of checkIns) {
    const date = ci.createdAt.toISOString().split("T")[0];
    const moodBar = "█".repeat(ci.moodScore) + "░".repeat(10 - ci.moodScore);
    console.log(
      `  ${date}  Mood: ${moodBar} ${ci.moodScore}/10  Energy: ${ci.energy}/10  ${ci.summary}`
    );
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  printBanner();

  const argv = await yargs(hideBin(process.argv))
    .option("userId", {
      alias: "u",
      type: "string",
      default: "demo-cli-user",
      description: "User ID for the check-in",
    })
    .option("message", {
      alias: "m",
      type: "string",
      description: "Start a check-in conversation with this message",
    })
    .option("insights", {
      alias: "i",
      type: "boolean",
      description: "Show latest pattern insights",
    })
    .option("nudge", {
      alias: "n",
      type: "boolean",
      description: "Generate and show a personalized nudge",
    })
    .option("status", {
      alias: "s",
      type: "boolean",
      description: "Show today's check-in status",
    })
    .option("history", {
      type: "boolean",
      description: "Show last 7 days of check-ins",
    })
    .help()
    .alias("help", "h")
    .parse();

  const userId = argv.userId;
  console.log(COLORS.gray(`  User: ${userId}\n`));

  try {
    if (argv.message) {
      await runInteractiveCheckin(userId, argv.message);
    } else if (argv.insights) {
      await showInsights(userId);
    } else if (argv.nudge) {
      await showNudge(userId);
    } else if (argv.status) {
      await showStatus(userId);
    } else if (argv.history) {
      await showHistory(userId);
    } else {
      // Default: start an interactive check-in
      console.log(
        COLORS.gray("  No command specified. Starting interactive check-in...\n")
      );
      const firstMessage = await askQuestion(
        COLORS.magenta("  How are you doing today? ")
      );
      if (firstMessage.trim()) {
        await runInteractiveCheckin(userId, firstMessage.trim());
      } else {
        console.log(COLORS.gray("  (No input provided. Exiting.)"));
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(COLORS.red(`\n  Error: ${error.message}`));
    } else {
      console.error(COLORS.red("\n  An unexpected error occurred."));
    }
    process.exit(1);
  }
}

main();
