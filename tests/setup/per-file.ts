import { inject, vi } from "vitest";

// Point Prisma at the local test database before any app module loads it.
const url = inject("databaseUrl");
if (!url || !new URL(url).hostname.match(/^(127\.0\.0\.1|localhost)$/)) {
  throw new Error(`Refusing to run tests against a non-local database: ${url}`);
}
process.env.DATABASE_URL = url;

// Route handlers read the session through `auth()` from @/lib/auth. Tests set
// the signed-in user with `signInAs()` / `signOut()` from tests/helpers.
// tests/auth/auth-config.test.ts un-mocks this to test the real config.
vi.mock("@/lib/auth", async () => {
  const { currentSession } = await import("../session-state");
  return {
    auth: vi.fn(async () => currentSession()),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
});

// Never send real email from tests; record what would have been sent.
vi.mock("@/lib/email", async () => {
  const { sentEmails } = await import("../session-state");
  return {
    sendPasswordResetEmail: vi.fn(async (to: string, resetUrl: string, siteUrl: string) => {
      sentEmails.push({ to, resetUrl, siteUrl });
    }),
    sendWelcomeEmail: vi.fn(async () => {}),
    sendPlanActivatedEmail: vi.fn(async () => {}),
    sendPaymentFailedEmail: vi.fn(async () => {}),
    sendAdminCodeEmail: vi.fn(async () => {}),
    sendModerationAlert: vi.fn(async () => {}),
    sendMarketingEmails: vi.fn(async (list: unknown[]) => ({ sent: list.length, failed: 0 })),
  };
});
