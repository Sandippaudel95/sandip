import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/* ==========================================================================
   Database client.

   Prisma 7 dropped the Rust query engine, so a driver adapter is required:
   `new PrismaClient()` with no adapter throws at runtime.

   Two things this file has to get right:

   1. One client across hot reloads. `next dev` re-imports modules on every
      edit, and a fresh pool each time exhausts the connection limit that
      free Postgres tiers set low.

   2. Construction is deferred until first use. Next evaluates modules while
      collecting page configuration at build time, so connecting eagerly
      makes `next build` fail whenever DATABASE_URL is absent — in CI, or
      locally before the database exists. Queries still fail loudly.
   ========================================================================== */

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function client(): PrismaClient {
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/** Behaves like a PrismaClient, but connects on first property access. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(client(), prop, receiver);
  },
}) as PrismaClient;
