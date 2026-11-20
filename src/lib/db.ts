import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 has no built-in query engine — it always connects through a
// driver adapter. @prisma/adapter-pg talks plain Postgres wire protocol,
// which works with Neon (or any other Postgres host) via its connection
// string, no Neon-specific package required.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js dev-mode singleton — without this, hot-reload would
// create a fresh PrismaClient (and a fresh connection pool) on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
