import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as email from "@/lib/email";
import * as register from "@/app/api/auth/register/route";
import { call, createUser, prisma, resetDb } from "../helpers";

beforeEach(async () => {
  vi.mocked(email.sendWelcomeEmail).mockClear();
  await resetDb();
});

const post = (body: unknown) => call(register.POST, { path: "/api/auth/register", body });

describe("POST /api/auth/register", () => {
  it("creates a tailor by default, normalising the email and hashing the password", async () => {
    const res = await post({ email: "  Ada@Example.COM ", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const user = await prisma.user.findUnique({ where: { email: "ada@example.com" } });
    expect(user).not.toBeNull();
    expect(user!.role).toBe("tailor");
    expect(user!.passwordHash).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", user!.passwordHash!)).toBe(true);
    expect(email.sendWelcomeEmail).toHaveBeenCalledWith("ada@example.com", { role: "tailor" });
  });

  it("creates a customer account when role is customer", async () => {
    await post({ email: "c@example.com", password: "secret123", role: "customer" });
    const user = await prisma.user.findUnique({ where: { email: "c@example.com" } });
    expect(user?.role).toBe("customer");
  });

  it("never returns the password hash", async () => {
    const res = await post({ email: "a@example.com", password: "secret123" });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it("409 when the email is already registered (case-insensitive)", async () => {
    await post({ email: "dup@example.com", password: "secret123" });
    const res = await post({ email: "DUP@example.com", password: "another123" });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/);
    expect(await prisma.user.count()).toBe(1);
  });

  it("409 for an existing user created elsewhere", async () => {
    const existing = await createUser("tailor");
    const res = await post({ email: existing.email, password: "secret123" });
    expect(res.status).toBe(409);
  });

  it.each([
    ["invalid email", { email: "not-an-email", password: "secret123" }],
    ["missing email", { password: "secret123" }],
    ["short password", { email: "a@example.com", password: "12345" }],
    ["missing password", { email: "a@example.com" }],
    ["unknown role", { email: "a@example.com", password: "secret123", role: "admin" }],
    ["non-string password", { email: "a@example.com", password: 12345678 }],
  ])("400 for %s", async (_name, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
    expect(await prisma.user.count()).toBe(0);
  });

  it("400 on malformed JSON", async () => {
    const res = await call(register.POST, { rawBody: "{bad", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
  });
});
