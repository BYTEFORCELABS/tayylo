// ============================================================
// Small server-only crypto helpers, all keyed off AUTH_SECRET (via HKDF, so
// each use gets its own independent key):
//
//  - sealToken / openToken: AES-256-GCM for secrets we must store and later
//    read back (Apple refresh tokens, kept only to revoke them).
//  - signValue / readSignedValue: HMAC-signed, expiring values for short-lived
//    cookies (Apple nonce, OAuth sign-up/link intent). Tamper-proof, not secret.
//
// Rotating AUTH_SECRET invalidates both (and signs everyone out anyway).
// ============================================================

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

function derivedKey(purpose: string): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return Buffer.from(hkdfSync("sha256", secret, "tayylo", purpose, 32));
}

const b64url = (b: Buffer) => b.toString("base64url");
const fromB64url = (s: string) => Buffer.from(s, "base64url");

// ---------------------------------------------------------------- encryption

const SEAL_VERSION = "v1";

export function sealToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivedKey("seal:v1"), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [SEAL_VERSION, b64url(iv), b64url(body), b64url(cipher.getAuthTag())].join(".");
}

/** The original string, or null if it was tampered with or sealed under another secret. */
export function openToken(sealed: string): string | null {
  const [version, iv, body, tag] = sealed.split(".");
  if (version !== SEAL_VERSION || !iv || !body || !tag) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", derivedKey("seal:v1"), fromB64url(iv));
    decipher.setAuthTag(fromB64url(tag));
    return Buffer.concat([decipher.update(fromB64url(body)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- signed values

function hmac(purpose: string, data: string) {
  return createHmac("sha256", derivedKey(`sign:${purpose}`)).update(data).digest();
}

/** `payload` JSON-encoded, expiring after `ttlSeconds`, bound to `purpose`. */
export function signValue(purpose: string, payload: unknown, ttlSeconds: number): string {
  const body = b64url(Buffer.from(JSON.stringify({ p: payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  return `${body}.${b64url(hmac(purpose, body))}`;
}

/** The payload, or null when missing, tampered with, for another purpose, or expired. */
export function readSignedValue<T>(purpose: string, value: string | undefined | null): T | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = hmac(purpose, body);
  const given = fromB64url(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { p, exp } = JSON.parse(fromB64url(body).toString("utf8")) as { p: T; exp: number };
    if (typeof exp !== "number" || exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

/** Reads one cookie from a raw Cookie header. */
export function cookieFromHeader(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      const raw = part.slice(eq + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return undefined;
}
