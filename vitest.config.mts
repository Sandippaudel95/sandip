import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/* The modules under test are pure by design — no database, no network —
   so they need no environment beyond Node. The alias mirrors the one in
   tsconfig rather than pulling in a plugin to read it. */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
