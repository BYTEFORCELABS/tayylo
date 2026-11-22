// Shared mutable state behind the @/lib/auth and @/lib/email mocks.
export interface TestSession {
  user: { id: string; email: string; role: "tailor" | "customer" };
}

let session: TestSession | null = null;

export function currentSession() {
  return session;
}
export function setSession(next: TestSession | null) {
  session = next;
}

export const sentEmails: { to: string; resetUrl: string; siteUrl: string }[] = [];
