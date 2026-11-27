/**
 * Permanent super admins of the admin portal. Always owners, whatever the
 * database says, and nobody (including each other) can remove their access,
 * suspend them or delete them from the portal. Changing this list takes a
 * code change and a deploy, on purpose.
 *
 * No imports here: the shared API helpers read it too.
 */
export const SUPER_ADMIN_EMAILS = ["isaacchukwuka67@gmail.com", "cyberzikk1@gmail.com"] as const;

export const isSuperAdmin = (email: string | null | undefined) =>
  !!email && (SUPER_ADMIN_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
