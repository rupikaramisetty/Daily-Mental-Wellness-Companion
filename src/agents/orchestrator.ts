/**
 * Orchestrator Agent — Multi-Agent Coordinator
 *
 * The orchestrator is the central coordinator of the multi-agent wellness
 * companion pipeline. It receives user messages, delegates to specialized
 * agents in the correct sequence, and aggregates results.
 *
 * Pipeline flow:
 * 1. User message → checkinAgent (multi-turn conversation)
 * 2. When complete → extractionAgent (parse structured data)
 * 3. Save to DB    → memoryAgent (persist check-in)
 * 4. If 5+ entries → patternAgent + nudgeAgent (analyze & generate nudges)
 *
 * @module agents/orchestrator
 */

import type { ConversationTurn } from "./base-agent";
import type { ExtractedCheckIn, NudgeItem } from "./wellness-agents";
import {
  runCheckinTurn,
  extractCheckinData,
  runPatternAndNudgePipeline,
} from "./wellness-agents";
import {
  saveCheckIn,
  getCheckInCount,
  getTodaysCheckIn,
} from "./memory-agent";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum number of check-ins required before the pattern + nudge pipeline runs.
 * This ensures there's enough data for meaningful analysis.
 */
const MIN_CHECKINS_FOR_PATTERN = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Response from the orchestrator after processing a check-in turn. */
export interface OrchestratorResponse {
  /** The agent's reply text to display to the user */
  reply: string;
  /** Whether the check-in conversation is complete */
  isComplete: boolean;
  /** Extracted check-in data (only when isComplete = true) */
  checkIn?: ExtractedCheckIn;
  /** Personalized nudges (only when isComplete = true and 5+ entries exist) */
  nudges?: NudgeItem[];
}

// ---------------------------------------------------------------------------
// Orchestrator Functions
// ---------------------------------------------------------------------------

/**
 * Handle a single turn of the check-in conversation.
 *
 * If the check-in is not yet complete, returns the agent's next reply.
 * If complete, orchestrates the full pipeline:
 * 1. Extracts structured data from the conversation
 * 2. Saves the check-in to the database
 * 3. Runs pattern + nudge analysis if enough data exists (≥5 check-ins)
 *
 * @param userId      - The user conducting the check-in
 * @param userMessage - The latest user message
 * @param history     - Prior conversation turns
 * @returns OrchestratorResponse with reply, completion status, and optional data
 */
export async function handleCheckinTurn(
  userId: string,
  userMessage: string,
  history: ConversationTurn[]
): Promise<OrchestratorResponse> {
  // Step 1: Run a check-in turn
  const { reply, isComplete } = await runCheckinTurn(history, userMessage);

  // If the conversation is still in progress, return the reply
  if (!isComplete) {
    return { reply, isComplete: false };
  }

  // Step 2: Build conversation transcript for extraction
  const fullHistory: ConversationTurn[] = [
    ...history,
    { role: "user", parts: [{ text: userMessage }] },
    { role: "model", parts: [{ text: reply }] },
  ];

  const transcript = fullHistory
    .map(
      (turn) =>
        `${turn.role === "user" ? "User" : "Companion"}: ${turn.parts.map((p) => p.text).join(" ")}`
    )
    .join("\n");

  // Step 3: Extract structured data
  const extracted = await extractCheckinData(transcript);

  // Step 4: Save check-in to database
  await saveCheckIn(userId, {
    ...extracted,
    rawText: transcript,
  });

  // Step 5: Run pattern + nudge pipeline if enough data exists
  let nudges: NudgeItem[] | undefined;
  const totalCheckIns = await getCheckInCount(userId);

  if (totalCheckIns >= MIN_CHECKINS_FOR_PATTERN) {
    const pipelineResult = await runPatternAndNudgePipeline(
      userId,
      extracted.moodScore
    );
    nudges = pipelineResult.nudges;
  }

  return {
    reply,
    isComplete: true,
    checkIn: extracted,
    nudges,
  };
}

/**
 * Check whether a user has already completed a check-in today.
 *
 * @param userId - The user to check
 * @returns true if a check-in exists for today
 */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const todaysCheckIn = await getTodaysCheckIn(userId);
  return todaysCheckIn !== null;
}
