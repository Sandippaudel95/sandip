import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

/* Prisma 7 moved the connection URL out of schema.prisma into this file.
   Next.js reads .env.local automatically, but the Prisma CLI does not, so
   load it here — that is where `neon link` writes DATABASE_URL. Values
   already in the environment win, which is what CI and Vercel rely on. */
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read directly rather than through prisma's env() helper so that
    // `prisma generate` still works in CI, where no database is reachable.
    url: process.env.DATABASE_URL ?? "",
  },
});
