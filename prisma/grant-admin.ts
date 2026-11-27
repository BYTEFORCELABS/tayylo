// Gives an existing Tayylo account access to the admin portal from the
// command line. Usually not needed: the super admins in
// src/lib/admin/super-admins.ts are always owners, and owners add everyone
// else from the portal's Team page. Run against the target database:
//
//   npm run admin:grant -- you@example.com            # owner
//   npm run admin:grant -- someone@example.com admin  # or moderator
//   npm run admin:grant -- someone@example.com none   # remove access
//
// Reads DATABASE_URL from .env.local (or the environment).
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { isSuperAdmin } from "../src/lib/admin/super-admins";

const ROLES = ["owner", "admin", "moderator", "none"];

async function main() {
  const [emailArg, roleArg = "owner"] = process.argv.slice(2);
  const email = emailArg?.trim().toLowerCase();
  if (!email || !ROLES.includes(roleArg)) {
    console.error("Usage: npm run admin:grant -- <email> [owner|admin|moderator|none]");
    process.exit(1);
  }
  if (isSuperAdmin(email) && roleArg !== "owner") {
    console.error(`${email} is a permanent super admin (src/lib/admin/super-admins.ts) and always has owner access.`);
    process.exit(1);
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`No account uses ${email}. Sign up in the app first, then run this again.`);
      process.exit(1);
    }
    const staffRole = roleArg === "none" ? null : roleArg;
    await prisma.user.update({ where: { id: user.id }, data: { staffRole } });
    await prisma.adminAuditLog.create({
      data: {
        actorEmail: "grant-admin script",
        action: staffRole ? "team.add" : "team.role",
        targetType: "user",
        targetId: user.id,
        summary: staffRole ? `Gave ${email} ${staffRole} access (command line)` : `Removed admin access from ${email} (command line)`,
      },
    });
    console.log(staffRole ? `${email} is now ${staffRole}.` : `${email} no longer has admin access.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
