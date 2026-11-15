import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mocked, so the real Prisma Client and `server-only` are never loaded.
vi.mock("@/lib/db/health", () => ({ checkDatabase: vi.fn() }));

import { POST } from "@/app/api/cron/heartbeat/route";
import { checkDatabase } from "@/lib/db/health";

const secret = "test-secret-0123456789";
const url = "http://localhost/api/cron/heartbeat";

function request(authorization?: string): Request {
  const headers = authorization ? { authorization } : undefined;
  return new Request(url, { method: "POST", headers });
}

describe("POST /api/cron/heartbeat", () => {
  beforeEach(() => {
    vi.mocked(checkDatabase).mockReset();
    vi.stubEnv("CRON_SECRET", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test("returns 500 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    const response = await POST(request(`Bearer ${secret}`));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "CRON_NOT_CONFIGURED", message: "Scheduled jobs are not configured." },
    });
    expect(checkDatabase).not.toHaveBeenCalled();
  });

  test.each([
    ["without a header", undefined],
    ["with a wrong secret", "Bearer wrong-secret"],
  ])("returns 401 %s and does no work", async (_case, header) => {
    const response = await POST(request(header));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
    expect(checkDatabase).not.toHaveBeenCalled();
  });

  test("returns 200 when the database check passes", async () => {
    vi.mocked(checkDatabase).mockResolvedValue();
    const response = await POST(request(`Bearer ${secret}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { database: "ok" } });
    expect(checkDatabase).toHaveBeenCalledOnce();
  });

  test("returns 503 without error details when the database check fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(checkDatabase).mockRejectedValue(new Error("connect failed: db.example.internal"));
    const response = await POST(request(`Bearer ${secret}`));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({
      error: { code: "DATABASE_UNAVAILABLE", message: "Database check failed." },
    });
    expect(body).not.toContain("db.example.internal");
    expect(consoleError).toHaveBeenCalledOnce();
    expect(String(consoleError.mock.calls[0])).not.toContain("db.example.internal");
  });

  test.each([
    ["success", `Bearer ${secret}`],
    ["refusal", undefined],
  ])("sets Cache-Control: no-store on %s", async (_case, header) => {
    vi.mocked(checkDatabase).mockResolvedValue();
    const response = await POST(request(header));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
