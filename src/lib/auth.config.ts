import type { NextAuthConfig } from "next-auth";

/* Edge-safe half of the auth setup: no bcrypt, no database, no Node APIs.
   Middleware imports this; the full config in auth.ts adds the Credentials
   provider, which needs Node. */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
  providers: [],
};
