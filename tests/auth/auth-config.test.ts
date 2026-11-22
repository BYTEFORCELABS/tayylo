import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, resetDb } from "../helpers";

// Test the REAL Auth.js config in src/lib/auth.ts: capture the object passed
// to NextAuth() and exercise its credentials authorize + callbacks directly.
vi.unmock("@/lib/auth");

// Only the parts of the Auth.js config these tests read.
interface CapturedConfig {
  session: { strategy: string };
  pages: { signIn: string };
  providers: { id: string; authorize?: (c: unknown) => Promise<unknown> }[];
  callbacks: {
    jwt: (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Record<string, unknown>;
    session: (args: { session: { user: Record<string, unknown> }; token: Record<string, unknown> }) => { user: Record<string, unknown> };
  };
}
const captured: { config?: CapturedConfig } = {};
vi.mock("next-auth", () => ({
  default: (config: unknown) => {
    captured.config = config as CapturedConfig;
    return { handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() };
  },
}));
vi.mock("next-auth/providers/credentials", () => ({ default: (o: object) => ({ id: "credentials", ...o }) }));
vi.mock("next-auth/providers/google", () => ({ default: (o: object) => ({ id: "google", ...o }) }));
vi.mock("next-auth/providers/apple", () => ({ default: (o: object) => ({ id: "apple", ...o }) }));

let config: CapturedConfig;
let authorize: (c: unknown) => Promise<unknown>;

beforeAll(async () => {
  await import("@/lib/auth");
  config = captured.config!;
  authorize = config.providers.find(p => p.id === "credentials")!.authorize!;
});

beforeEach(resetDb);

describe("auth config", () => {
  it("uses JWT sessions and the /auth sign-in page", () => {
    expect(config.session.strategy).toBe("jwt");
    expect(config.pages.signIn).toBe("/auth");
  });

  it("only enables Google/Apple when their credentials are configured", () => {
    // No GOOGLE_/APPLE_ env vars in tests: the providers should not be offered.
    const ids = config.providers.map((p: { id: string }) => p.id);
    expect(ids).not.toContain("google");
    expect(ids).not.toContain("apple");
  });
});

describe("credentials authorize", () => {
  it("returns id, email and role for valid credentials", async () => {
    const u = await createUser("customer", "Secret123");
    expect(await authorize({ email: u.email, password: "Secret123" })).toEqual({ id: u.id, email: u.email, role: "customer" });
  });

  it("matches email case- and whitespace-insensitively", async () => {
    const u = await createUser("tailor", "Secret123");
    const res = (await authorize({ email: `  ${u.email.toUpperCase()} `, password: "Secret123" })) as { id: string };
    expect(res?.id).toBe(u.id);
  });

  it("null for a wrong password", async () => {
    const u = await createUser("tailor", "Secret123");
    expect(await authorize({ email: u.email, password: "Wrong123" })).toBeNull();
  });

  it("null for an unknown user", async () => {
    expect(await authorize({ email: "ghost@example.com", password: "Secret123" })).toBeNull();
  });

  it.each([
    ["missing email", { password: "Secret123" }],
    ["missing password", { email: "a@example.com" }],
    ["empty strings", { email: "", password: "" }],
    ["non-string values", { email: ["a@example.com"], password: 123 }],
    ["undefined credentials", undefined],
  ])("null for %s", async (_n, creds) => {
    expect(await authorize(creds)).toBeNull();
  });
});

describe("callbacks", () => {
  it("jwt copies id and role from the user on sign-in", () => {
    expect(config.callbacks.jwt({ token: {}, user: { id: "u1", role: "customer" } })).toMatchObject({ id: "u1", role: "customer" });
    expect(config.callbacks.jwt({ token: {}, user: { id: "u2", role: "tailor" } })).toMatchObject({ id: "u2", role: "tailor" });
  });

  it("jwt maps an unknown or missing role to tailor", () => {
    expect(config.callbacks.jwt({ token: {}, user: { id: "u3" } }).role).toBe("tailor");
    expect(config.callbacks.jwt({ token: {}, user: { id: "u4", role: "admin" } }).role).toBe("tailor");
  });

  it("jwt leaves the token untouched on later calls (no user)", () => {
    const token = { id: "u1", role: "customer", sub: "x" };
    expect(config.callbacks.jwt({ token })).toEqual(token);
  });

  it("session exposes id and a normalised role", () => {
    const s = config.callbacks.session({ session: { user: { email: "a@b.co" } }, token: { id: "u1", role: "customer" } });
    expect(s.user).toMatchObject({ id: "u1", role: "customer", email: "a@b.co" });
    const t = config.callbacks.session({ session: { user: {} }, token: { id: "u2", role: "weird" } });
    expect(t.user.role).toBe("tailor");
  });
});
