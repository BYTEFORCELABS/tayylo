import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import type { TestProject } from "vitest/node";

// Starts a throwaway in-memory Postgres (PGlite) on a random local port,
// applies every Prisma migration in order, and hands its URL to the test
// workers. The database disappears when the run ends.
let server: PGLiteSocketServer | undefined;
let db: PGlite | undefined;

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export async function setup(project: TestProject) {
  db = await PGlite.create();

  const dir = join(process.cwd(), "prisma", "migrations");
  const migrations = readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();
  for (const name of migrations) {
    await db.exec(readFileSync(join(dir, name, "migration.sql"), "utf8"));
  }

  const port = 20000 + Math.floor(Math.random() * 20000);
  server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });
  await server.start();

  project.provide("databaseUrl", `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`);
}

export async function teardown() {
  await server?.stop();
  await db?.close();
}
