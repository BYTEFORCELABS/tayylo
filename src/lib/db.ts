import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 has no built-in query engine — it always connects through a
// driver adapter. @prisma/adapter-pg talks plain Postgres wire protocol,
// which works with Neon (or any other Postgres host) via its connection
// string, no Neon-specific package required.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js dev-mode singleton — without this, hot-reload would
// create a fresh PrismaClient (and a fresh connection pool) on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaSchema?: string };

// In dev, a client cached before `prisma generate` would reject new tables
// *and* new columns, so the cache is keyed by every model's field list and
// rebuilt whenever the generated schema changes.
const schemaKey = Object.entries(Prisma)
  .filter(([k]) => k.endsWith("ScalarFieldEnum"))
  .map(([k, v]) => `${k}:${Object.keys(v as object).join(",")}`)
  .join("|");
const cached = globalForPrisma.prismaSchema === schemaKey ? globalForPrisma.prisma : undefined;
export const prisma = cached ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchema = schemaKey;
}
