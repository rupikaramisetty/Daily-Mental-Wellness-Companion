/**
 * Memory Agent — Database Layer
 *
 * Pure data-access layer for the wellness companion. This agent handles all
 * Prisma reads and writes — it makes NO Gemini AI calls. It serves as the
 * persistent memory for the multi-agent system, storing check-ins, patterns,
 * and nudges in Supabase (PostgreSQL).
 *
 * Role in the pipeline: Called by the orchestrator and wellness agents to
 * persist conversation outcomes and retrieve historical data for analysis.
 *
 * @module agents/memory-agent
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data shape for creating a new check-in record. */
export interface CheckInData {
  moodScore: number;
  energy: number;
  sleep: number | null;
  summary: string;
  worries: string | null;
  rawText: string;
  tags: string[];
}

/** Data shape for creating / updating a pattern record. */
export interface PatternData {
  moodTrend: string;
  summary: string;
  insights: Prisma.InputJsonValue;
  entryCount: number;
}

// Helper function to ensure user exists
async function ensureUserExists(userId: string): Promise<void> {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@example.com`,
      name: userId === "demo-user-001" ? "Demo User" : userId,
    },
  });
}

// ---------------------------------------------------------------------------
// Check-In Operations
// ---------------------------------------------------------------------------

/**
 * Save a new wellness check-in to the database.
 *
 * @param userId - The user who completed the check-in
 * @param data   - Structured check-in data extracted by the extraction agent
 * @returns The created CheckIn record
 */
export async function saveCheckIn(userId: string, data: CheckInData) {
  await ensureUserExists(userId);
  return prisma.checkIn.create({
    data: {
      userId,
      moodScore: data.moodScore,
      energy: data.energy,
      sleep: data.sleep,
      summary: data.summary,
      worries: data.worries,
      rawText: data.rawText,
      tags: data.tags,
    },
  });
}

/**
 * Retrieve recent check-ins for a user, ordered oldest-first.
 *
 * @param userId - The user to fetch check-ins for
 * @param days   - How many days back to look (default 14)
 * @returns Array of CheckIn records sorted by createdAt ascending
 */
export async function getRecentCheckIns(userId: string, days: number = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return prisma.checkIn.findMany({
    where: {
      userId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Get the total number of check-ins a user has completed.
 *
 * @param userId - The user to count check-ins for
 * @returns Total check-in count
 */
export async function getCheckInCount(userId: string): Promise<number> {
  return prisma.checkIn.count({ where: { userId } });
}

/**
 * Get today's check-in for a user, if it exists.
 *
 * @param userId - The user to look up
 * @returns Today's CheckIn record, or null if none exists
 */
export async function getTodaysCheckIn(userId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return prisma.checkIn.findFirst({
    where: {
      userId,
      createdAt: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Pattern Operations
// ---------------------------------------------------------------------------

/**
 * Save or update a weekly pattern analysis.
 * Uses upsert on the unique [userId, weekStart] constraint.
 *
 * @param userId      - The user this pattern belongs to
 * @param weekStart   - The start date of the analysis week
 * @param patternData - Pattern analysis data from the pattern agent
 * @returns The upserted Pattern record
 */
export async function savePattern(
  userId: string,
  weekStart: Date,
  patternData: PatternData
) {
  await ensureUserExists(userId);
  return prisma.pattern.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    create: {
      userId,
      weekStart,
      moodTrend: patternData.moodTrend,
      summary: patternData.summary,
      insights: patternData.insights,
      entryCount: patternData.entryCount,
    },
    update: {
      moodTrend: patternData.moodTrend,
      summary: patternData.summary,
      insights: patternData.insights,
      entryCount: patternData.entryCount,
    },
  });
}

/**
 * Retrieve the most recent pattern analysis for a user.
 *
 * @param userId - The user to look up
 * @returns The latest Pattern record, or null if none exist
 */
export async function getLatestPattern(userId: string) {
  return prisma.pattern.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Nudge Operations
// ---------------------------------------------------------------------------

/**
 * Save a personalized nudge to the database.
 *
 * @param userId    - The user this nudge is for
 * @param message   - The nudge message text
 * @param category  - Nudge category (sleep, exercise, social, work, mindfulness)
 * @param patternId - Optional ID of the pattern that generated this nudge
 * @returns The created Nudge record
 */
export async function saveNudge(
  userId: string,
  message: string,
  category: string,
  patternId?: string
) {
  await ensureUserExists(userId);
  return prisma.nudge.create({
    data: {
      userId,
      message,
      category,
      patternId: patternId ?? null,
    },
  });
}
