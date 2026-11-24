import { createHmac } from "node:crypto";

// Authenticator-app codes (TOTP, RFC 6238: HMAC-SHA1, 30-second steps, 6 digits) for the local-only
// 2FA browser test (unit 1.4). Plain node:crypto, so no new dependency. The setup key it reads is
// shown on the Settings page during the test and lives only in memory; never print it or a code.

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(value: string): Buffer {
  const clean = value.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) {
      throw new Error("The setup key isn't valid base32.");
    }
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Buffer.from(bytes);
}

export function timeStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

export function totpAt(secret: string, step: number, digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, "0");
}

// Codes for one secret that are never reused: Supabase may refuse a code it has already accepted,
// so each call waits for a fresh 30-second step when the current one was used.
export function codeSource(secret: string) {
  let lastStep = -1;
  return {
    async next(): Promise<string> {
      while (timeStep() <= lastStep) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      lastStep = timeStep();
      return totpAt(secret, lastStep);
    },
    // A code that is certainly wrong right now (different from the codes either side of now).
    wrong(): string {
      const step = timeStep();
      const valid = new Set([step - 1, step, step + 1].map((s) => totpAt(secret, s)));
      let candidate = 0;
      while (valid.has(String(candidate).padStart(DIGITS, "0"))) {
        candidate += 1;
      }
      return String(candidate).padStart(DIGITS, "0");
    },
  };
}
