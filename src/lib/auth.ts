import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { appleClientSecret, appleConfig, appleNativeEnabled, appleWebEnabled, isPrivateRelayEmail } from "@/lib/apple";
import { AppleNativeError, appleNativeSignIn } from "@/lib/apple-native";
import { cleanName, IdentityError, resolveIdentityUser, type ProviderProfile } from "@/lib/identity";
import { consumeOAuthIntent } from "@/lib/oauth-intent";
import { googleEnabled } from "@/lib/google";
import { MobileCodeError, readMobilePending, redeemMobileCode } from "@/lib/mobile-oauth";
import { verifyAdminCode } from "@/lib/admin/otp";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      role: "tailor" | "customer";
      name?: string | null;
      image?: string | null;
    };
  }
}

/** Credentials failure with a machine-readable `code` (lands in the redirect URL as ?code=). */
class SignInFailed extends CredentialsSignin {
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

/**
 * Apple returns to /api/auth/callback/apple with a cross-site POST
 * (response_mode=form_post). Auth.js's state / nonce / PKCE / callback-url
 * cookies default to SameSite=Lax, which browsers withhold on that POST — the
 * callback would fail its checks. On HTTPS, send them SameSite=None; Secure.
 * (They're HttpOnly, short-lived and single-purpose; the session cookie
 * itself stays Lax.) Plain-http development keeps the defaults — Apple
 * doesn't allow http/localhost return URLs anyway.
 */
const crossSiteCookies =
  process.env.NODE_ENV === "production"
    ? (() => {
        const options = { httpOnly: true, sameSite: "none" as const, path: "/", secure: true };
        return {
          state: { name: "__Secure-authjs.state", options: { ...options, maxAge: 60 * 15 } },
          nonce: { name: "__Secure-authjs.nonce", options },
          pkceCodeVerifier: { name: "__Secure-authjs.pkce.code_verifier", options: { ...options, maxAge: 60 * 15 } },
          callbackUrl: { name: "__Secure-authjs.callback-url", options },
        };
      })()
    : undefined;

/** Suspended accounts can't start a session, whichever way they sign in. */
async function assertNotSuspended<T extends { id: string }>(user: T): Promise<T> {
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { suspendedAt: true } });
  if (row?.suspendedAt) throw new SignInFailed("suspended");
  return user;
}

/** Normalises what Apple/Google return into one shape for resolveIdentityUser. */
function providerProfile(
  provider: "apple" | "google",
  account: { providerAccountId: string; refresh_token?: string },
  profile: Record<string, unknown> | undefined,
  user: { name?: string | null },
): ProviderProfile {
  const email = typeof profile?.email === "string" ? profile.email : null;
  const truthy = (v: unknown) => v === true || v === "true";
  if (provider === "apple") {
    return {
      provider,
      providerUserId: account.providerAccountId,
      email,
      isPrivateEmail: truthy(profile?.is_private_email) || isPrivateRelayEmail(email),
      name: user.name ?? null,
      refreshToken: account.refresh_token ?? null,
      tokenClientId: account.refresh_token ? appleConfig()?.servicesId ?? null : null,
    };
  }
  return {
    provider,
    providerUserId: account.providerAccountId,
    email,
    emailVerified: truthy(profile?.email_verified),
    name: cleanName(typeof profile?.name === "string" ? profile.name : null),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  ...(crossSiteCookies ? { cookies: crossSiteCookies } : {}),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Apple/Google-only accounts have no password until they set one via reset.
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;
        if (user.suspendedAt) throw new SignInFailed("suspended");

        return { id: user.id, email: user.email, role: user.role };
      },
    }),

    // Native iOS Sign in with Apple (see src/lib/apple-native.ts). Verifies
    // the identity token + server-issued nonce and mints the normal session.
    ...(appleNativeEnabled()
      ? [
          Credentials({
            id: "apple-native",
            name: "Apple (iOS)",
            credentials: {
              identityToken: {},
              authorizationCode: {},
              givenName: {},
              familyName: {},
              role: {},
            },
            async authorize(credentials, request) {
              try {
                const user = await appleNativeSignIn(credentials, request.headers.get("cookie"));
                await assertNotSuspended(user);
                return { id: user.id, email: user.email, role: user.role };
              } catch (e) {
                if (e instanceof SignInFailed) throw e;
                if (e instanceof AppleNativeError) throw new SignInFailed(e.code);
                console.error("[apple] native sign-in failed:", (e as Error).message);
                throw new SignInFailed("apple_failed");
              }
            },
          }),
        ]
      : []),

    // Mobile app: redeems the one-time code from a Google/Apple sign-in run in
    // the system browser sheet (see src/lib/mobile-oauth.ts) for a session.
    Credentials({
      id: "mobile-oauth",
      name: "Mobile sign-in",
      credentials: { code: {}, verifier: {} },
      async authorize(credentials) {
        try {
          return await assertNotSuspended(await redeemMobileCode(credentials?.code, credentials?.verifier));
        } catch (e) {
          if (e instanceof SignInFailed) throw e;
          if (!(e instanceof MobileCodeError)) console.error("[auth] mobile sign-in failed:", (e as Error).message);
          throw new SignInFailed("code_invalid");
        }
      },
    }),

    // Admin portal: a one-time code emailed to staff (src/lib/admin/otp.ts).
    Credentials({
      id: "admin-code",
      name: "Admin sign-in code",
      credentials: { email: {}, code: {} },
      async authorize(credentials) {
        const user = await verifyAdminCode(credentials?.email, credentials?.code);
        if (!user) throw new SignInFailed("code_invalid");
        return user;
      },
    }),

    ...(googleEnabled()
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),

    // Web Sign in with Apple. Apple has no static client secret: it's an
    // ES256 JWT signed with the .p8 key. Auth.js re-reads provider options on
    // every request, so this getter hands it a cached secret that renews
    // itself before expiring (src/lib/apple.ts).
    ...(appleWebEnabled()
      ? [
          Apple({
            clientId: appleConfig()!.servicesId!,
            get clientSecret() {
              try {
                return appleClientSecret(appleConfig()!.servicesId!);
              } catch (e) {
                // A bad key must not take email/password sign-in down with it.
                console.error("[apple] could not create client secret:", (e as Error).message);
                return "";
              }
            },
            // Apple sends the name (as a separate `user` form field, which
            // Auth.js parses into profile.user) only on the first consent, and
            // it may be partial or absent.
            profile(profile) {
              const name = (profile as { user?: { name?: { firstName?: string; lastName?: string } } }).user?.name;
              return {
                id: profile.sub,
                email: profile.email ?? null,
                name: cleanName(name?.firstName, name?.lastName),
                image: null,
              };
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * Apple/Google: map the provider identity to a Tayylo user (creating or
     * linking per src/lib/identity.ts) and swap the provider's id for ours.
     * Without a database adapter this object is the same one the jwt
     * callback receives next.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "apple" && account?.provider !== "google") return true;
      const intent = await consumeOAuthIntent();
      try {
        const resolved = await resolveIdentityUser(
          providerProfile(account.provider, account, profile as Record<string, unknown> | undefined, user),
          { role: intent?.role, linkToUserId: intent?.linkUserId },
        );
        const row = await prisma.user.findUnique({ where: { id: resolved.id }, select: { suspendedAt: true } });
        if (row?.suspendedAt) throw new IdentityError("suspended");
        Object.assign(user, { id: resolved.id, email: resolved.email, role: resolved.role });
        return true;
      } catch (e) {
        const code = e instanceof IdentityError ? e.code : "oauth_failed";
        if (!(e instanceof IdentityError)) console.error(`[auth] ${account.provider} sign-in failed:`, (e as Error).message);
        const params = new URLSearchParams({ provider: account.provider, code });
        if (intent?.linkUserId) return `${intent.returnTo === "/account" ? "/account" : "/settings"}?linkError=1&${params}`;
        // A sign-in started by the mobile app reports back to the app.
        if (await readMobilePending()) return `/api/auth/mobile/finish?${params}`;
        return `/auth?error=OAuthSignin&${params}`;
      }
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role === "customer" ? "customer" : "tailor";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role === "customer" ? "customer" : "tailor";
      }
      return session;
    },
  },
});
