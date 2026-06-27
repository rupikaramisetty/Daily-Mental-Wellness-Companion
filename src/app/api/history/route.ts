/**
 * History API Route
 *
 * Next.js App Router GET handler to fetch historical check-ins
 * and weekly patterns for a user. Supports security validation
 * and applies security headers.
 *
 * @module app/api/history/route
 */

import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/middleware/security";
import { getRecentCheckIns, getLatestPattern } from "@/agents/memory-agent";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/history?userId=...
 *
 * Fetches recent check-in entries, latest weekly insights, and active nudges.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  // Validate userId exists and fits security criteria (alphanumeric, underscores, hyphens)
  if (!userId || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Invalid or missing userId" }, { status: 400 })
    );
  }

  try {
    // Fetch parallel database records
    const [checkIns, latestPattern, nudges] = await Promise.all([
      getRecentCheckIns(userId, 14),
      getLatestPattern(userId),
      prisma.nudge.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    return applySecurityHeaders(
      NextResponse.json({
        checkIns,
        latestPattern,
        nudges,
      })
    );
  } catch (error) {
    console.error("History fetch error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to retrieve history" },
        { status: 500 }
      )
    );
  }
}
