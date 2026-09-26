import "dotenv/config";
import { defineConfig } from "prisma/config";

/* Prisma 7 moved the connection URL out of schema.prisma into this file.
   process.env is read directly rather than through prisma's env() helper so
   that `prisma generate` still works in CI, where no database is reachable. */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
