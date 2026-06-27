/**
 * Security Middleware
 *
 * Comprehensive security layer for the wellness companion API. Provides:
 * - Input validation via Zod schemas
 * - Input sanitization (script injection, control characters)
 * - Rate limiting (in-memory, per-user)
 * - Crisis language detection with 988 Lifeline resources
 * - Security headers (CSP, X-Frame-Options, etc.)
 *
 * All /api routes MUST call validateCheckinRequest() before any other logic.
 *
 * @module middleware/security
 */

import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Zod Schema
// ---------------------------------------------------------------------------

/**
 * Validates the shape and constraints of a check-in API request body.
 */
export const CheckinRequestSchema = z.object({
  userId: z
    .string()
    .min(1, "userId is required")
    .max(128, "userId too long")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "userId must be alphanumeric with underscores and hyphens only"
    ),
  message: z
    .string()
    .min(1, "message is required")
    .max(2000, "message must be 2000 characters or less"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .max(30, "history must have 30 or fewer turns"),
});

/** Inferred type from the check-in request schema. */
export type CheckinRequest = z.infer<typeof CheckinRequestSchema>;

// ---------------------------------------------------------------------------
// Input Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize user input by removing control characters and script injection attempts.
 * Strips HTML script tags, event handlers, and non-printable characters while
 * preserving normal text and common punctuation.
 *
 * @param text - Raw user input
 * @returns Sanitized text safe for processing
 */
export function sanitizeInput(text: string): string {
  let sanitized = text;

  // Remove HTML script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove HTML event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove other dangerous HTML tags
  sanitized = sanitized.replace(/<\/?(?:iframe|object|embed|form|input|img)[^>]*>/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript\s*:/gi, "");

  // Remove control characters (keep newlines, tabs, and normal whitespace)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return sanitized.trim();
}

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

/** Tracks request timestamps per user for rate limiting. */
const rateLimitMap = new Map<string, number[]>();

/** Maximum requests allowed per window. */
const RATE_LIMIT_MAX = 20;

/** Rate limit window in milliseconds (60 seconds). */
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Check whether a user is within the rate limit.
 * Uses an in-memory sliding window of request timestamps.
 *
 * @param userId - The user to check
 * @returns Object with `allowed` (boolean) and `remaining` (requests left)
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) ?? [];

  // Remove timestamps outside the window
  const validTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (validTimestamps.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, validTimestamps);
    return { allowed: false, remaining: 0 };
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return { allowed: true, remaining: RATE_LIMIT_MAX - validTimestamps.length };
}

// ---------------------------------------------------------------------------
// Crisis Detection
// ---------------------------------------------------------------------------

/**
 * Crisis language patterns to detect self-harm, suicide, or severe distress.
 * These regex patterns are intentionally broad to err on the side of caution.
 */
const CRISIS_PATTERNS: RegExp[] = [
  /\b(suicid|kill\s*(my)?self|end\s*(my|it\s*all)|want\s*to\s*die)\b/i,
  /\b(self[- ]?harm|cut(ting)?\s*myself|hurt(ing)?\s*myself)\b/i,
  /\b(don'?t\s*want\s*to\s*(be\s*alive|live|exist))\b/i,
  /\b(no\s*reason\s*to\s*(live|go\s*on))\b/i,
  /\b(better\s*off\s*(dead|without\s*me))\b/i,
  /\b(plan(ning)?\s*to\s*(end|kill))\b/i,
];

/**
 * Detect crisis language in user input.
 * Returns true if any crisis pattern matches, indicating the user may be
 * in immediate danger and should be directed to professional resources.
 *
 * @param text - User input to scan
 * @returns true if crisis language is detected
 */
export function detectCrisisLanguage(text: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Get the crisis response message with 988 Suicide & Crisis Lifeline resources.
 *
 * @returns Formatted crisis response string
 */
export function getCrisisResponse(): string {
  return [
    "I'm concerned about what you've shared, and I want you to know that you matter.",
    "",
    "Please reach out to a trained crisis counselor who can help:",
    "",
    "📞 **988 Suicide & Crisis Lifeline**: Call or text **988** (available 24/7)",
    "💬 **Crisis Text Line**: Text **HOME** to **741741**",
    "🌐 **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/",
    "",
    "You are not alone, and help is available right now.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

/**
 * Apply security headers to a NextResponse.
 * Adds standard security headers to protect against common web vulnerabilities.
 *
 * @param response - The NextResponse to add headers to
 * @returns The same response with security headers applied
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

// ---------------------------------------------------------------------------
// Request Validation Pipeline
// ---------------------------------------------------------------------------

/**
 * Validate an incoming check-in API request through the full security pipeline.
 *
 * Runs checks in this order:
 * 1. JSON body parsing
 * 2. Zod schema validation
 * 3. Rate limiting
 * 4. Input sanitization
 * 5. Crisis language detection
 *
 * @param req - The incoming NextRequest
 * @returns Success with sanitized data, or failure with an error NextResponse
 */
export async function validateCheckinRequest(
  req: NextRequest
): Promise<
  | { ok: true; data: CheckinRequest }
  | { ok: false; response: NextResponse }
> {
  // Step 1: Parse JSON body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: applySecurityHeaders(
        NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      ),
    };
  }

  // Step 2: Validate with Zod schema
  const parseResult = CheckinRequestSchema.safeParse(body);
  if (!parseResult.success) {
    return {
      ok: false,
      response: applySecurityHeaders(
        NextResponse.json(
          {
            error: "Validation failed",
            details: parseResult.error.issues.map((i) => i.message),
          },
          { status: 400 }
        )
      ),
    };
  }

  const data = parseResult.data;

  // Step 3: Rate limiting
  const { allowed, remaining } = checkRateLimit(data.userId);
  if (!allowed) {
    const resp = applySecurityHeaders(
      NextResponse.json(
        { error: "Rate limit exceeded. Please wait before trying again." },
        { status: 429 }
      )
    );
    resp.headers.set("X-RateLimit-Remaining", String(remaining));
    return { ok: false, response: resp };
  }

  // Step 4: Sanitize input
  data.message = sanitizeInput(data.message);

  // Sanitize history messages
  data.history = data.history.map((turn) => ({
    ...turn,
    parts: turn.parts.map((part) => ({
      text: sanitizeInput(part.text),
    })),
  }));

  // Step 5: Crisis language detection
  if (detectCrisisLanguage(data.message)) {
    return {
      ok: false,
      response: applySecurityHeaders(
        NextResponse.json(
          {
            reply: getCrisisResponse(),
            isComplete: false,
            isCrisis: true,
          },
          { status: 200 }
        )
      ),
    };
  }

  return { ok: true, data };
}
