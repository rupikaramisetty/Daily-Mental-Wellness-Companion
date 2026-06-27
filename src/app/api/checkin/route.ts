/**
 * Check-In API Route
 *
 * Next.js App Router POST handler for wellness check-in conversations.
 * All requests pass through the full security validation pipeline before
 * reaching the multi-agent orchestrator.
 *
 * @module app/api/checkin/route
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateCheckinRequest,
  applySecurityHeaders,
} from "@/middleware/security";
import { handleCheckinTurn, hasCheckedInToday } from "@/agents/orchestrator";

/**
 * POST /api/checkin
 *
 * Process a wellness check-in conversation turn. The request is validated,
 * sanitized, and rate-limited before being passed to the orchestrator.
 *
 * @param req - Incoming request with userId, message, and history
 * @returns JSON response with agent reply and optional check-in data / nudges
 */
export async function POST(req: NextRequest) {
  // Step 1: Run full security validation pipeline
  const validation = await validateCheckinRequest(req);

  if (!validation.ok) {
    return validation.response;
  }

  const { userId, message, history } = validation.data;

  try {
    // Step 2: Check if user already checked in today (only on first turn)
    if (history.length === 0) {
      const alreadyDone = await hasCheckedInToday(userId);
      if (alreadyDone) {
        return applySecurityHeaders(
          NextResponse.json({
            reply:
              "You've already completed your check-in for today! Come back tomorrow. 🌟",
            isComplete: true,
          })
        );
      }
    }

    // Step 3: Run the orchestrator
    const result = await handleCheckinTurn(userId, message, history);

    // Step 4: Return response with security headers
    return applySecurityHeaders(NextResponse.json(result));
  } catch (error) {
    console.error("Check-in error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "An unexpected error occurred. Please try again." },
        { status: 500 }
      )
    );
  }
}
