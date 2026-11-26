import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { signIn } from "@/lib/auth";
import {
  challengeFor,
  issueMobileCode,
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_MARKER,
  MobileCodeError,
  redeemMobileCode,
  signMobilePending,
} from "@/lib/mobile-oauth";
import { OAUTH_INTENT_COOKIE, type OAuthIntent } from "@/lib/oauth-intent";
import { readSignedValue, signValue } from "@/lib/token-crypto";
import * as startRoute from "@/app/api/auth/mobile/[provider]/route";
import * as finishRoute from "@/app/api/auth/mobile/finish/route";
import * as providersRoute from "@/app/api/auth/mobile/providers/route";
import { createUser, resetDb, signInAs, signOut } from "../helpers";

// The routes read and write cookies through next/headers; give them a jar.
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    has: (name: string) => jar.has(name),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

const verifier = () => randomBytes(32).toString("base64url");
const location = (res: Response) => res.headers.get("location") ?? "";
const appParams = (res: Response) => {
  expect(location(res).startsWith("tayylo://auth/callback?")).toBe(true);
  return new URL(location(res)).searchParams;
};
const start = (provider: string, query: string) =>
  startRoute.GET(new Request(`https://app.tayylo.com/api/auth/mobile/${provider}?${query}`), {
    params: Promise.resolve({ provider }),
  });
const finish = (query = "") => finishRoute.GET(new Request(`https://app.tayylo.com/api/auth/mobile/finish${query}`));

const env = { ...process.env };
beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = "google-client";
  process.env.GOOGLE_CLIENT_SECRET = "google-secret";
  delete process.env.APPLE_CLIENT_ID;
});
afterAll(() => {
  process.env = env;
});
beforeEach(async () => {
  await resetDb();
  jar.clear();
  signOut();
  vi.mocked(signIn).mockReset();
});

describe("one-time mobile code", () => {
  it("redeems only with the verifier it was issued for", async () => {
    const user = await createUser("customer");
    const v = verifier();
    const code = issueMobileCode(user.id, challengeFor(v));

    await expect(redeemMobileCode(code, v)).resolves.toMatchObject({ id: user.id, email: user.email, role: "customer" });
    await expect(redeemMobileCode(code, verifier())).rejects.toBeInstanceOf(MobileCodeError);
  });

  it("rejects tampered, foreign-purpose, malformed and orphaned codes", async () => {
    const user = await createUser();
    const v = verifier();
    const code = issueMobileCode(user.id, challengeFor(v));
    const [body, sig] = code.split(".");

    await expect(redeemMobileCode(`${body}x.${sig}`, v)).rejects.toBeInstanceOf(MobileCodeError);
    await expect(redeemMobileCode(signValue("oauth-intent", { uid: user.id, ch: challengeFor(v) }, 60), v)).rejects.toBeInstanceOf(MobileCodeError);
    await expect(redeemMobileCode(code, "short")).rejects.toBeInstanceOf(MobileCodeError);
    await expect(redeemMobileCode(undefined, v)).rejects.toBeInstanceOf(MobileCodeError);
    await expect(redeemMobileCode(issueMobileCode("no-such-user", challengeFor(v)), v)).rejects.toBeInstanceOf(MobileCodeError);
  });

  it("expires after two minutes", async () => {
    const user = await createUser();
    const v = verifier();
    const code = issueMobileCode(user.id, challengeFor(v));
    vi.useFakeTimers({ now: Date.now() + 121_000 });
    try {
      await expect(redeemMobileCode(code, v)).rejects.toBeInstanceOf(MobileCodeError);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("GET /api/auth/mobile/[provider]", () => {
  it("bounces a bad challenge or a disabled provider straight back to the app", async () => {
    expect(appParams(await start("google", "challenge=short")).get("error")).toBe("invalid_request");
    const apple = appParams(await start("apple", `challenge=${challengeFor(verifier())}`));
    expect(apple.get("error")).toBe("not_configured");
    expect(apple.get("provider")).toBe("apple");
    expect(appParams(await start("github", `challenge=${challengeFor(verifier())}`)).get("error")).toBe("not_configured");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("remembers the challenge and role, then starts the provider redirect", async () => {
    vi.mocked(signIn).mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?state=abc");
    const ch = challengeFor(verifier());
    const res = await start("google", `challenge=${ch}&role=customer`);

    expect(res.status).toBe(302);
    expect(location(res)).toBe("https://accounts.google.com/o/oauth2/v2/auth?state=abc");
    expect(signIn).toHaveBeenCalledWith("google", { redirect: false, redirectTo: "/api/auth/mobile/finish" });
    expect(readSignedValue<{ ch: string }>("mobile-oauth", jar.get(MOBILE_OAUTH_COOKIE))).toEqual({ ch });
    expect(readSignedValue<OAuthIntent>("oauth-intent", jar.get(OAUTH_INTENT_COOKIE))).toEqual({ role: "customer" });
    expect(jar.get(MOBILE_OAUTH_MARKER)).toBe("1");
  });

  it("never carries a link intent or an unknown role", async () => {
    vi.mocked(signIn).mockResolvedValue("https://accounts.google.com/");
    await start("google", `challenge=${challengeFor(verifier())}&role=admin&link=1`);
    expect(readSignedValue<OAuthIntent>("oauth-intent", jar.get(OAUTH_INTENT_COOKIE))).toEqual({});
  });
});

describe("GET /api/auth/mobile/finish", () => {
  it("swaps the browser session for a code the app can redeem, and signs the browser out", async () => {
    const user = await createUser();
    const v = verifier();
    jar.set(MOBILE_OAUTH_COOKIE, signMobilePending(challengeFor(v), 600));
    jar.set(MOBILE_OAUTH_MARKER, "1");
    jar.set("__Secure-authjs.session-token", "browser-session");
    signInAs(user);

    const code = appParams(await finish()).get("code");
    expect(code).toBeTruthy();
    await expect(redeemMobileCode(code, v)).resolves.toMatchObject({ id: user.id });
    expect([...jar.keys()]).toEqual([]);
  });

  it("hands provider errors back to the app", async () => {
    jar.set(MOBILE_OAUTH_COOKIE, signMobilePending(challengeFor(verifier()), 600));
    const params = appParams(await finish("?error=OAuthSignin&provider=google&code=email_in_use"));
    expect(params.get("error")).toBe("email_in_use");
    expect(params.get("provider")).toBe("google");

    jar.set(MOBILE_OAUTH_COOKIE, signMobilePending(challengeFor(verifier()), 600));
    expect(appParams(await finish("?error=AccessDenied")).get("error")).toBe("access_denied");

    jar.set(MOBILE_OAUTH_COOKIE, signMobilePending(challengeFor(verifier()), 600));
    expect(appParams(await finish()).get("error")).toBe("oauth_failed"); // no session
  });

  it("ignores visits that aren't a pending mobile sign-in", async () => {
    signInAs(await createUser());
    const res = await finish();
    expect(location(res)).toBe("https://app.tayylo.com/");
  });
});

describe("GET /api/auth/mobile/providers", () => {
  it("reports which buttons the app can show", async () => {
    expect(await (await providersRoute.GET()).json()).toEqual({ google: true, apple: false, appleNative: false });
  });
});
