import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Migrations (`prisma migrate deploy`, run by the `vercel-build` script)
    // should use Neon's direct, non-pooled connection when one is set — the
    // pooled endpoint can break migration locking. The app itself always
    // connects with DATABASE_URL (see src/lib/db.ts).
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
});
