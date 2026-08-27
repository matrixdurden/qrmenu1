import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { authRateLimits } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000;
const BLOCK_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 12;

export async function assertAuthRateLimit(key: string) {
  const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
  if (row?.blockedUntil && row.blockedUntil > new Date()) throw new Error("RATE_LIMITED");
}

export async function recordAuthFailure(key: string) {
  const now = new Date();
  await db.transaction(async (tx) => {
    const [row] = await tx.select().from(authRateLimits).where(eq(authRateLimits.key, key)).limit(1);
    if (!row || now.getTime() - row.windowStartedAt.getTime() > WINDOW_MS) {
      await tx.insert(authRateLimits).values({ key, attempts: 1, windowStartedAt: now, blockedUntil: null, updatedAt: now }).onConflictDoUpdate({
        target: authRateLimits.key,
        set: { attempts: 1, windowStartedAt: now, blockedUntil: null, updatedAt: now },
      });
      return;
    }

    const attempts = row.attempts + 1;
    await tx.update(authRateLimits).set({
      attempts,
      blockedUntil: attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : row.blockedUntil,
      updatedAt: now,
    }).where(eq(authRateLimits.key, key));
  });
}

export async function clearAuthRateLimit(key: string) {
  await db.delete(authRateLimits).where(eq(authRateLimits.key, key));
}
