import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Backend test suite. Route handlers are imported and called directly with
// real Request objects against a real Postgres (PGlite, in-process, started
// by tests/setup/global-setup.ts) with every migration applied. Nothing here
// ever reads .env.local or touches the hosted database.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/setup/global-setup.ts"],
    setupFiles: ["tests/setup/per-file.ts"],
    // One shared database: run files one at a time so a reset in one file
    // can't wipe rows another file is using.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    // Keep secrets out of the test process even if a shell exported them.
    env: {
      RESEND_API_KEY: "",
      BLOB_READ_WRITE_TOKEN: "",
      AUTH_SECRET: "test-secret-not-used-for-real-sessions",
    },
  },
});
