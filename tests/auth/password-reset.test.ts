import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it } from "vitest";
import * as forgot from "@/app/api/auth/forgot-password/route";
import * as reset from "@/app/api/auth/reset-password/route";
import { call, createUser, prisma, resetDb } from "../helpers";
import { sentEmails } from "../session-state";

beforeEach(async () => {
  await resetDb();
  sentEmails.length = 0;
});

const requestReset = (email: unknown) => call(forgot.POST, { path: "/api/auth/forgot-password", body: { email } });
const doReset = (token: unknown, password: unknown) => call(reset.POST, { path: "/api/auth/reset-password", body: { token, password } });

/** Requests a reset and returns the raw token from the "sent" email link. */
async function tokenFor(email: string) {
  await requestReset(email);
  const link = sentEmails.at(-1)!.resetUrl;
  return new URL(link).searchParams.get("token")!;
}

describe("POST /api/auth/forgot-password", () => {
  it("sends a reset link for a known email (case-insensitive) and stores only a hash", async () => {
    const user = await createUser();
    const res = await requestReset(user.email.toUpperCase());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe(user.email);
    const url = new URL(sentEmails[0].resetUrl);
    expect(url.origin).toBe("http://localhost:3000");
    expect(url.pathname).toBe("/auth/reset");
    expect(sentEmails[0].siteUrl).toBe("http://localhost:3000");

    const raw = url.searchParams.get("token")!;
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    const rows = await prisma.passwordResetToken.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toBe(crypto.createHash("sha256").update(raw).digest("hex"));
    const ttl = rows[0].expiresAt.getTime() - Date.now();
    expect(ttl).toBeGreaterThan(55 * 60_000);
    expect(ttl).toBeLessThanOrEqual(60 * 60_000);
  });

  it("responds identically for an unknown email and sends nothing", async () => {
    await createUser();
    const res = await requestReset("nobody@example.com");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sentEmails).toHaveLength(0);
    expect(await prisma.passwordResetToken.count()).toBe(0);
  });

  it("400 for an invalid email", async () => {
    const res = await requestReset("nope");
    expect(res.status).toBe(400);
  });

  it("400 on malformed JSON", async () => {
    const res = await call(forgot.POST, { rawBody: "{bad", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/reset-password", () => {
  it("sets the new password and marks the token used", async () => {
    const user = await createUser("tailor", "OldPass123");
    const token = await tokenFor(user.email);

    const res = await doReset(token, "NewPass456");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("NewPass456", after.passwordHash)).toBe(true);
    expect(await bcrypt.compare("OldPass123", after.passwordHash)).toBe(false);
    const row = await prisma.passwordResetToken.findFirstOrThrow({ where: { userId: user.id } });
    expect(row.usedAt).not.toBeNull();
  });

  it("a token works only once", async () => {
    const user = await createUser();
    const token = await tokenFor(user.email);
    expect((await doReset(token, "First1234")).status).toBe(200);
    const again = await doReset(token, "Second1234");
    expect(again.status).toBe(400);
    expect(again.body.error).toMatch(/invalid or has expired/);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("First1234", after.passwordHash)).toBe(true);
  });

  it("rejects an expired token without changing the password", async () => {
    const user = await createUser("tailor", "OldPass123");
    const token = await tokenFor(user.email);
    await prisma.passwordResetToken.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await doReset(token, "NewPass456");
    expect(res.status).toBe(400);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(await bcrypt.compare("OldPass123", after.passwordHash)).toBe(true);
  });

  it("rejects an unknown token", async () => {
    const res = await doReset("f".repeat(64), "NewPass456");
    expect(res.status).toBe(400);
  });

  it("invalidates other outstanding reset links once the password is reset", async () => {
    const user = await createUser();
    const older = await tokenFor(user.email);
    const newer = await tokenFor(user.email);
    expect((await doReset(newer, "NewPass456")).status).toBe(200);
    const res = await doReset(older, "Attacker999");
    expect(res.status).toBe(400);
  });

  it.each([
    ["short password", "x".repeat(64), "12345"],
    ["short token", "abc", "NewPass456"],
    ["missing token", undefined, "NewPass456"],
  ])("400 for %s", async (_n, token, password) => {
    const res = await doReset(token, password);
    expect(res.status).toBe(400);
  });

  it("400 on malformed JSON", async () => {
    const res = await call(reset.POST, { rawBody: "{bad", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });
});
