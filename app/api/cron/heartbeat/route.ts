import { authorizeCron } from "@/lib/cron/authorize";
import { checkDatabase } from "@/lib/db/health";

// The daily heartbeat, run by the `heartbeat` schedule in vercel.json. It checks the CRON_SECRET,
// then runs a read-only SELECT 1. It changes nothing, so a repeated run is harmless. See
// context/feature-specs/0.6-vercel-deployment-daily-cron.md.

const noStore = { "Cache-Control": "no-store" };

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: noStore });
}

export async function POST(request: Request): Promise<Response> {
  const auth = authorizeCron(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (auth === "not-configured") {
    return errorResponse(500, "CRON_NOT_CONFIGURED", "Scheduled jobs are not configured.");
  }
  if (auth === "unauthorized") {
    return errorResponse(401, "UNAUTHORIZED", "Unauthorized.");
  }

  try {
    await checkDatabase();
  } catch (error) {
    // Only the error's name: Prisma messages can include the database host.
    const name = error instanceof Error ? error.name : "UnknownError";
    const runId = request.headers.get("ce-id") ?? "manual";
    console.error(`heartbeat: database check failed (${name}, run ${runId})`);
    return errorResponse(503, "DATABASE_UNAVAILABLE", "Database check failed.");
  }

  return Response.json({ data: { database: "ok" } }, { headers: noStore });
}
