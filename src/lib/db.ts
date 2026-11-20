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

// In dev, a client cached before `prisma generate` (new models added) would
// lack the new tables, so rebuild it when a current model is missing.
const cached = globalForPrisma.prisma && "stylePost" in globalForPrisma.prisma ? globalForPrisma.prisma : undefined;
export const prisma = cached ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
