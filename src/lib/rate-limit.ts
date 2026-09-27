import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RateLimitOptions = {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window size in milliseconds. */
  windowMs: number;
};

/**
 * Fixed-window rate limiter backed by Postgres (no Redis needed at this scale).
 * Returns true if the request is allowed, false if the caller should be rejected (HTTP 429).
 */
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / opts.windowMs) * opts.windowMs);

  const hit = await prisma.rateLimitHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  // Opportunistically sweep old rows instead of running a cron job.
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    prisma.rateLimitHit.deleteMany({ where: { windowStart: { lt: cutoff } } }).catch(() => {});
  }

  return hit.count <= opts.limit;
}

/** Best-effort client IP extraction for serverless/edge deployments behind a proxy. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimited() {
  return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
}
