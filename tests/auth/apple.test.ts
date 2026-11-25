import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrivateKey, createPublicKey, generateKeyPairSync } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT, type CryptoKey, type JWK } from "jose";
import {
  __setAppleJwksForTests,
  appleClientSecret,
  hashNonce,
  normalizePrivateKey,
  verifyAppleIdToken,
} from "@/lib/apple";
import { AppleNativeError, appleNativeSignIn } from "@/lib/apple-native";
import { IdentityError, resolveIdentityUser } from "@/lib/identity";
import { openToken } from "@/lib/token-crypto";
import * as nonceRoute from "@/app/api/auth/apple/nonce/route";
import * as intentRoute from "@/app/api/auth/oauth-intent/route";
import * as notificationsRoute from "@/app/api/auth/apple/notifications/route";
import * as identitiesRoute from "@/app/api/me/identities/route";
import * as identityRoute from "@/app/api/me/identities/[provider]/route";
import * as accountRoute from "@/app/api/account/route";
import { readSignedValue } from "@/lib/token-crypto";
import { call, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

// ------------------------------------------------------------------ fixtures
//
// A local stand-in for Apple: an RSA key published through a local JWKS
// (instead of https://appleid.apple.com/auth/keys) signs identity tokens, and
// an EC P-256 key plays the role of the .p8 used for client secrets.

const TEAM_ID = "TEAMID1234";
const KEY_ID = "KEYID12345";
const SERVICES_ID = "com.tayylo.app.web";
const BUNDLE_ID = "com.tayylo.app";

let appleKey: CryptoKey;
let otherKey: CryptoKey;
let p8: string;
let p8Public: ReturnType<typeof createPublicKey>;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  appleKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "apple-test-1", alg: "RS256", use: "sig" };
  __setAppleJwksForTests(createLocalJWKSet({ keys: [jwk] }));

  const ec = generateKeyPairSync("ec", { namedCurve: "P-256" });
  p8 = ec.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  p8Public = ec.publicKey;

  process.env.APPLE_TEAM_ID = TEAM_ID;
  process.env.APPLE_KEY_ID = KEY_ID;
  // As it usually ends up in an env var: one line with literal \n escapes.
  process.env.APPLE_PRIVATE_KEY = p8.replace(/\n/g, "\\n");
  process.env.APPLE_CLIENT_ID = SERVICES_ID;
  process.env.APPLE_BUNDLE_ID = BUNDLE_ID;
});

beforeEach(resetDb);
afterEach(() => vi.unstubAllGlobals());

let subSeq = 0;
const newSub = () => `000123.${Date.now().toString(16)}${(++subSeq).toString(16)}.0420`;

async function appleToken(claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; aud?: string; iss?: string; exp?: string | number } = {}) {
  return new SignJWT({ email_verified: "true", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "apple-test-1" })
    .setIssuer(opts.iss ?? "https://appleid.apple.com")
    .setAudience(opts.aud ?? BUNDLE_ID)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "5m")
    .sign(opts.key ?? appleKey);
}

/** Calls the nonce route like the app does; returns the nonce and the Cookie header to send back. */
async function getNonce() {
  const res = await nonceRoute.POST(new Request("https://app.tayylo.com/api/auth/apple/nonce", { method: "POST" }));
  const body = (await res.json()) as { nonce: string };
  const setCookie = res.headers.get("set-cookie")!;
  return { nonce: body.nonce, cookie: setCookie.split(";")[0], setCookie };
}

/** Stubs Apple's token / revoke endpoints. */
function stubAppleHttp(handlers: { token?: () => Response | Promise<Response>; revoke?: () => Response } = {}) {
  const calls: { url: string; body: URLSearchParams }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      calls.push({ url, body: new URLSearchParams(String(init?.body ?? "")) });
      if (url.endsWith("/auth/token")) return handlers.token ? handlers.token() : Response.json({ error: "invalid_grant" }, { status: 400 });
      if (url.endsWith("/auth/revoke")) return handlers.revoke ? handlers.revoke() : new Response(null, { status: 200 });
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
  return calls;
}

// ------------------------------------------------------------------ client secret

describe("Apple client secret", () => {
  it("accepts the .p8 with real newlines, \\n escapes, or as a bare base64 body", () => {
    const body = p8.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    for (const variant of [p8, p8.replace(/\n/g, "\\n"), `"${p8.replace(/\n/g, "\\n")}"`, body]) {
      expect(() => createPrivateKey(normalizePrivateKey(variant))).not.toThrow();
    }
  });

  it("is an ES256 JWT Apple can verify: iss=team, sub=client id, aud=Apple, kid=key id, ≤ 6 months", async () => {
    const jwt = appleClientSecret(SERVICES_ID);
    const { payload, protectedHeader } = await jwtVerify(jwt, p8Public, { algorithms: ["ES256"] });
    expect(protectedHeader).toMatchObject({ alg: "ES256", kid: KEY_ID });
    expect(payload).toMatchObject({ iss: TEAM_ID, sub: SERVICES_ID, aud: "https://appleid.apple.com" });
    expect(payload.exp! - payload.iat!).toBeLessThanOrEqual(15_777_000);
  });

  it("is cached, and renewed before it expires", () => {
    const now = Math.floor(Date.now() / 1000) + 1000; // a fresh time slot for this test
    const first = appleClientSecret(BUNDLE_ID, now);
    expect(appleClientSecret(BUNDLE_ID, now + 60)).toBe(first);
    // 29.5 days later (inside the 1-day renewal window of a 30-day secret).
    expect(appleClientSecret(BUNDLE_ID, now + 60 * 60 * 24 * 29.5)).not.toBe(first);
  });

  it("is separate per client id (web Services ID vs iOS bundle id)", async () => {
    const web = await jwtVerify(appleClientSecret(SERVICES_ID), p8Public);
    const ios = await jwtVerify(appleClientSecret(BUNDLE_ID), p8Public);
    expect(web.payload.sub).toBe(SERVICES_ID);
    expect(ios.payload.sub).toBe(BUNDLE_ID);
  });
});

// ------------------------------------------------------------------ identity tokens

describe("verifyAppleIdToken", () => {
  it("accepts a valid token and reads email + private relay flags", async () => {
    const sub = newSub();
    const token = await appleToken({ sub, email: "Abc@PrivateRelay.AppleID.com", is_private_email: "true", nonce: "n1" });
    const id = await verifyAppleIdToken(token, { audience: BUNDLE_ID, nonce: "n1" });
    expect(id).toMatchObject({ sub, email: "abc@privaterelay.appleid.com", isPrivateEmail: true, emailVerified: true });
  });

  it.each([
    ["wrong audience", { aud: "com.someone.else" }],
    ["wrong issuer", { iss: "https://evil.example.com" }],
    ["expired", { exp: Math.floor(Date.now() / 1000) - 120 }],
  ])("rejects a token with %s", async (_label, opts) => {
    const token = await appleToken({ sub: newSub() }, opts);
    await expect(verifyAppleIdToken(token, { audience: BUNDLE_ID })).rejects.toThrow(/rejected/);
  });

  it("rejects a token not signed by Apple's key", async () => {
    const token = await appleToken({ sub: newSub() }, { key: otherKey });
    await expect(verifyAppleIdToken(token, { audience: BUNDLE_ID })).rejects.toThrow(/rejected/);
  });

  it("rejects a nonce mismatch, and a missing nonce when one is expected", async () => {
    await expect(verifyAppleIdToken(await appleToken({ sub: newSub(), nonce: "a" }), { audience: BUNDLE_ID, nonce: "b" })).rejects.toThrow(/nonce/);
    await expect(verifyAppleIdToken(await appleToken({ sub: newSub() }), { audience: BUNDLE_ID, nonce: "b" })).rejects.toThrow(/nonce/);
  });

  it("rejects garbage", async () => {
    await expect(verifyAppleIdToken("not-a-jwt", { audience: BUNDLE_ID })).rejects.toThrow();
  });
});

// ------------------------------------------------------------------ account resolution

describe("resolveIdentityUser", () => {
  const apple = (sub: string, extra: Record<string, unknown> = {}) => ({ provider: "apple" as const, providerUserId: sub, ...extra });

  it("creates a password-less account for a new Apple ID (relay email, name, role)", async () => {
    const sub = newSub();
    const r = await resolveIdentityUser(apple(sub, { email: "xyz@privaterelay.appleid.com", isPrivateEmail: true, name: " Ada  Lovelace " }), { role: "customer" });
    expect(r).toMatchObject({ email: "xyz@privaterelay.appleid.com", role: "customer", isNewUser: true });
    const user = await prisma.user.findUnique({ where: { id: r.id }, include: { identities: true } });
    expect(user).toMatchObject({ passwordHash: null, name: "Ada Lovelace" });
    expect(user!.identities[0]).toMatchObject({ provider: "apple", providerUserId: sub, isPrivateEmail: true });
  });

  it("signs the same Apple ID into the same account later — even with no name or email", async () => {
    const sub = newSub();
    const first = await resolveIdentityUser(apple(sub, { email: "a@example.com", name: "Ada" }));
    const again = await resolveIdentityUser(apple(sub, { email: null, name: null }));
    expect(again).toMatchObject({ id: first.id, isNewUser: false });
    const user = await prisma.user.findUnique({ where: { id: first.id }, include: { identities: true } });
    expect(user!.name).toBe("Ada"); // not wiped
    expect(user!.identities[0].email).toBe("a@example.com"); // not wiped
    expect(await prisma.user.count()).toBe(1);
  });

  it("never overwrites an existing name, but fills an empty one", async () => {
    const sub = newSub();
    const r = await resolveIdentityUser(apple(sub, { email: "b@example.com" }));
    await resolveIdentityUser(apple(sub, { name: "Grace Hopper" }));
    expect((await prisma.user.findUnique({ where: { id: r.id } }))!.name).toBe("Grace Hopper");
    await resolveIdentityUser(apple(sub, { name: "Someone Else" }));
    expect((await prisma.user.findUnique({ where: { id: r.id } }))!.name).toBe("Grace Hopper");
  });

  it("does NOT merge into an existing account just because the email matches", async () => {
    const existing = await createUser("tailor");
    await expect(resolveIdentityUser(apple(newSub(), { email: existing.email.toUpperCase() }))).rejects.toMatchObject({ code: "email_in_use" });
    expect(await prisma.authIdentity.count()).toBe(0);
    expect(await prisma.user.count()).toBe(1);
  });

  it("links to the signed-in account when linking deliberately", async () => {
    const existing = await createUser("tailor");
    const sub = newSub();
    const r = await resolveIdentityUser(apple(sub, { email: existing.email }), { linkToUserId: existing.id });
    expect(r).toMatchObject({ id: existing.id, isNewUser: false });
    // …and from then on Apple sign-in reaches that account.
    expect((await resolveIdentityUser(apple(sub))).id).toBe(existing.id);
  });

  it("refuses to link an Apple ID that belongs to another account", async () => {
    const sub = newSub();
    await resolveIdentityUser(apple(sub, { email: "owner@example.com" }));
    const other = await createUser("tailor");
    await expect(resolveIdentityUser(apple(sub), { linkToUserId: other.id })).rejects.toMatchObject({ code: "identity_taken" });
  });

  it("refuses to link a second, different Apple ID to the same account", async () => {
    const u = await createUser("tailor");
    await resolveIdentityUser(apple(newSub()), { linkToUserId: u.id });
    await expect(resolveIdentityUser(apple(newSub()), { linkToUserId: u.id })).rejects.toMatchObject({ code: "provider_already_linked" });
  });

  it("needs an email to create an account", async () => {
    await expect(resolveIdentityUser(apple(newSub(), { email: null }))).rejects.toBeInstanceOf(IdentityError);
    await expect(resolveIdentityUser({ provider: "google", providerUserId: "g1", email: "x@example.com", emailVerified: false })).rejects.toMatchObject({ code: "no_email" });
  });

  it("handles a double submit of the same new Apple ID without creating two accounts", async () => {
    const sub = newSub();
    const p = apple(sub, { email: "race@example.com" });
    const [a, b] = await Promise.all([resolveIdentityUser(p), resolveIdentityUser(p)]);
    expect(a.id).toBe(b.id);
    expect(await prisma.user.count()).toBe(1);
  });
});

// ------------------------------------------------------------------ native iOS flow

describe("native iOS sign-in", () => {
  it("nonce route: returns the SHA-256 of a raw nonce kept in a signed HttpOnly cookie", async () => {
    const { nonce, setCookie, cookie } = await getNonce();
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/Secure/);
    const raw = readSignedValue<string>("apple-nonce", decodeURIComponent(cookie.split("=")[1]));
    expect(hashNonce(raw!)).toBe(nonce);
  });

  it("creates the account, stores the refresh token encrypted, and signs in the same account next time", async () => {
    const sub = newSub();
    const calls = stubAppleHttp({
      token: async () => Response.json({ refresh_token: "r-apple-123", id_token: await appleToken({ sub }) }),
    });
    const { nonce, cookie } = await getNonce();
    const identityToken = await appleToken({ sub, nonce, email: "me@privaterelay.appleid.com", is_private_email: true });

    const user = await appleNativeSignIn(
      { identityToken, authorizationCode: "c-1", givenName: "Ada", familyName: "Lovelace", role: "customer" },
      cookie,
    );
    expect(user).toMatchObject({ email: "me@privaterelay.appleid.com", role: "customer", isNewUser: true });

    // Code exchanged with the bundle id and an ES256 client secret for it.
    expect(calls[0].body.get("client_id")).toBe(BUNDLE_ID);
    expect((await jwtVerify(calls[0].body.get("client_secret")!, p8Public)).payload.sub).toBe(BUNDLE_ID);

    const identity = await prisma.authIdentity.findFirstOrThrow({ where: { providerUserId: sub } });
    expect(identity.refreshToken).not.toContain("r-apple-123");
    expect(openToken(identity.refreshToken!)).toBe("r-apple-123");
    expect(identity.tokenClientId).toBe(BUNDLE_ID);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Ada Lovelace");

    // Second sign-in: Apple sends no name/email this time.
    const n2 = await getNonce();
    const again = await appleNativeSignIn({ identityToken: await appleToken({ sub, nonce: n2.nonce }) }, n2.cookie);
    expect(again).toMatchObject({ id: user.id, isNewUser: false });
  });

  it("still signs in if Apple's code exchange fails (identity token already proves who it is)", async () => {
    stubAppleHttp(); // token endpoint → 400 invalid_grant
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { nonce, cookie } = await getNonce();
    const sub = newSub();
    const user = await appleNativeSignIn({ identityToken: await appleToken({ sub, nonce, email: "e@example.com" }), authorizationCode: "bad" }, cookie);
    expect(user.isNewUser).toBe(true);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0])).not.toContain("bad"); // never logs the code
  });

  it("rejects a code that belongs to a different Apple user than the identity token", async () => {
    stubAppleHttp({ token: async () => Response.json({ refresh_token: "r", id_token: await appleToken({ sub: "someone-else" }) }) });
    const { nonce, cookie } = await getNonce();
    await expect(
      appleNativeSignIn({ identityToken: await appleToken({ sub: newSub(), nonce, email: "x@example.com" }), authorizationCode: "c" }, cookie),
    ).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("rejects: no nonce cookie, wrong nonce, web audience, forged signature", async () => {
    const { nonce, cookie } = await getNonce();
    const sub = newSub();
    const fail = (input: Record<string, unknown>, c: string | null) => appleNativeSignIn(input, c).then(() => null, (e: AppleNativeError) => e.code);

    expect(await fail({ identityToken: await appleToken({ sub, nonce }) }, null)).toBe("nonce_expired");
    expect(await fail({ identityToken: await appleToken({ sub, nonce }) }, "tayylo.apple-nonce=tampered.value")).toBe("nonce_expired");
    expect(await fail({ identityToken: await appleToken({ sub, nonce: hashNonce("other") }) }, cookie)).toBe("invalid_token");
    expect(await fail({ identityToken: await appleToken({ sub, nonce }, { aud: SERVICES_ID }) }, cookie)).toBe("invalid_token");
    expect(await fail({ identityToken: await appleToken({ sub, nonce }, { key: otherKey }) }, cookie)).toBe("invalid_token");
    expect(await fail({}, cookie)).toBe("invalid_token");
    expect(await prisma.user.count()).toBe(0);
  });

  it("reports email_in_use instead of merging with a password account", async () => {
    const existing = await createUser("tailor");
    const { nonce, cookie } = await getNonce();
    await expect(
      appleNativeSignIn({ identityToken: await appleToken({ sub: newSub(), nonce, email: existing.email }) }, cookie),
    ).rejects.toMatchObject({ code: "email_in_use" });
  });

  it("same Apple ID on web and iOS reaches one account", async () => {
    const sub = newSub();
    // Web: Auth.js has verified the token (aud = Services ID) and calls the resolver.
    const web = await resolveIdentityUser({ provider: "apple", providerUserId: sub, email: "both@example.com", name: "Web User" });
    // iOS: same `sub` (same Team ID), different audience.
    const { nonce, cookie } = await getNonce();
    const ios = await appleNativeSignIn({ identityToken: await appleToken({ sub, nonce }) }, cookie);
    expect(ios.id).toBe(web.id);
  });
});

// ------------------------------------------------------------------ settings: link / unlink

describe("sign-in methods API", () => {
  it("lists methods for the signed-in user", async () => {
    const u = await createUser();
    signInAs(u);
    const res = await call(identitiesRoute.GET);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ hasPassword: true, identities: [], available: { appleWeb: true, appleNative: true } });
    signOut();
    expect((await call(identitiesRoute.GET)).status).toBe(401);
  });

  it("links Apple from the app to the signed-in account (no email match needed)", async () => {
    const u = await createUser();
    signInAs(u);
    stubAppleHttp();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { nonce, cookie } = await getNonce();
    const sub = newSub();
    const res = await call(identityRoute.POST, {
      body: { identityToken: await appleToken({ sub, nonce, email: "relay@privaterelay.appleid.com" }) },
      headers: { cookie },
      params: { provider: "apple" },
    });
    expect(res.status).toBe(200);
    expect(res.body.identities[0]).toMatchObject({ provider: "apple" });
    expect((await prisma.authIdentity.findFirstOrThrow({ where: { providerUserId: sub } })).userId).toBe(u.id);
  });

  it("won't disconnect the only way to sign in", async () => {
    const r = await resolveIdentityUser({ provider: "apple", providerUserId: newSub(), email: "only@example.com" });
    signInAs({ id: r.id, email: r.email, role: r.role });
    const res = await call(identityRoute.DELETE, { method: "DELETE", params: { provider: "apple" } });
    expect(res.status).toBe(409);
    expect(await prisma.authIdentity.count()).toBe(1);
  });

  it("disconnects (and revokes) when a password remains", async () => {
    const u = await createUser();
    await resolveIdentityUser({ provider: "apple", providerUserId: newSub(), refreshToken: "rt", tokenClientId: SERVICES_ID }, { linkToUserId: u.id });
    signInAs(u);
    const calls = stubAppleHttp();
    const res = await call(identityRoute.DELETE, { method: "DELETE", params: { provider: "apple" } });
    expect(res.status).toBe(200);
    expect(await prisma.authIdentity.count()).toBe(0);
    expect(calls.find(c => c.url.endsWith("/auth/revoke"))?.body.get("token")).toBe("rt");
  });

  it("oauth-intent: only an authenticated user can ask to link, JSON only", async () => {
    signOut();
    expect((await call(intentRoute.POST, { body: { link: true } })).status).toBe(401);
    expect((await call(intentRoute.POST, { rawBody: "link=true", headers: { "content-type": "application/x-www-form-urlencoded" } })).status).toBe(415);
    const res = await intentRoute.POST(
      new Request("https://app.tayylo.com/api/auth/oauth-intent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ role: "customer" }) }),
    );
    expect(res.status).toBe(200);
    // Survives Apple's cross-site form_post return on HTTPS.
    expect(res.headers.get("set-cookie")).toMatch(/HttpOnly; Secure; SameSite=None/);
  });
});

// ------------------------------------------------------------------ deletion + notifications

describe("account deletion and Apple notifications", () => {
  it("revokes the Apple grant before deleting the account", async () => {
    const r = await resolveIdentityUser({ provider: "apple", providerUserId: newSub(), email: "del@example.com", refreshToken: "rt-del", tokenClientId: BUNDLE_ID });
    signInAs({ id: r.id, email: r.email, role: r.role });
    const calls = stubAppleHttp();
    expect((await call(accountRoute.DELETE, { method: "DELETE" })).status).toBe(200);
    const revoke = calls.find(c => c.url.endsWith("/auth/revoke"))!;
    expect(revoke.body.get("token")).toBe("rt-del");
    expect(revoke.body.get("client_id")).toBe(BUNDLE_ID);
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.authIdentity.count()).toBe(0);
  });

  it("still deletes the account when Apple's revoke endpoint is down", async () => {
    const r = await resolveIdentityUser({ provider: "apple", providerUserId: newSub(), email: "del2@example.com", refreshToken: "rt", tokenClientId: BUNDLE_ID });
    signInAs({ id: r.id, email: r.email, role: r.role });
    stubAppleHttp({ revoke: () => new Response(null, { status: 503 }) });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await call(accountRoute.DELETE, { method: "DELETE" })).status).toBe(200);
    expect(await prisma.user.count()).toBe(0);
  });

  const notification = (events: Record<string, unknown>, opts: { key?: CryptoKey } = {}) =>
    new SignJWT({ events: JSON.stringify(events) })
      .setProtectedHeader({ alg: "RS256", kid: "apple-test-1" })
      .setIssuer("https://appleid.apple.com")
      .setAudience(BUNDLE_ID)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(opts.key ?? appleKey);

  it("consent-revoked forgets the refresh token but keeps the link", async () => {
    const sub = newSub();
    await resolveIdentityUser({ provider: "apple", providerUserId: sub, email: "n@example.com", refreshToken: "rt", tokenClientId: BUNDLE_ID });
    const res = await call(notificationsRoute.POST, { body: { payload: await notification({ type: "consent-revoked", sub }) } });
    expect(res.status).toBe(200);
    const identity = await prisma.authIdentity.findFirstOrThrow({ where: { providerUserId: sub } });
    expect(identity.refreshToken).toBeNull();
  });

  it("account-delete removes the link, keeps the Tayylo account", async () => {
    const sub = newSub();
    await resolveIdentityUser({ provider: "apple", providerUserId: sub, email: "n2@example.com" });
    await call(notificationsRoute.POST, { body: { payload: await notification({ type: "account-delete", sub }) } });
    expect(await prisma.authIdentity.count()).toBe(0);
    expect(await prisma.user.count()).toBe(1);
  });

  it("rejects unsigned or forged notifications", async () => {
    expect((await call(notificationsRoute.POST, { body: {} })).status).toBe(400);
    const forged = await notification({ type: "account-delete", sub: "x" }, { key: otherKey });
    expect((await call(notificationsRoute.POST, { body: { payload: forged } })).status).toBe(400);
  });
});
