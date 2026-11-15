import { createHash, timingSafeEqual } from "node:crypto";

// The CRON_SECRET check shared by every scheduled route in app/api/cron/. Vercel Schedules sends
// `Authorization: Bearer <CRON_SECRET>` on each run of a path target. See
// context/feature-specs/0.6-vercel-deployment-daily-cron.md.

export type CronAuthResult = "ok" | "unauthorized" | "not-configured";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function authorizeCron(
  authorizationHeader: string | null,
  secret: string | undefined,
): CronAuthResult {
  // Fail closed: without a secret, no request is accepted.
  if (!secret) {
    return "not-configured";
  }
  if (authorizationHeader === null) {
    return "unauthorized";
  }

  // Hashing gives both sides the same length, so timingSafeEqual can compare them in constant time.
  const expected = sha256(`Bearer ${secret}`);
  const received = sha256(authorizationHeader);
  return timingSafeEqual(expected, received) ? "ok" : "unauthorized";
}
