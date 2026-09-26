import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

/* ==========================================================================
   Admin authentication.

   One account, held in environment variables. ADMIN_PASSWORD_HASH is a
   bcrypt hash, never a plaintext password, and never committed. Generate it
   with:

     node -e "console.log(require('bcryptjs').hashSync('your-password', 12))"
   ========================================================================== */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? "";

/** Non-empty bcrypt hash of a random string, for the miss path below. */
const DUMMY_HASH =
  "$2b$12$C6UzMDM.H6dfI/f/IKcEe.Kb/Ov4lEYjJ0Hv0hZvKcmSMC1A2A2Zy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");

        if (!ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
          console.error(
            "[auth] ADMIN_EMAIL or ADMIN_PASSWORD_HASH is not set; refusing all sign-ins.",
          );
          return null;
        }

        const emailMatches = email === ADMIN_EMAIL.trim().toLowerCase();

        // Always run a comparison, even when the email is wrong, so the
        // response time does not reveal whether the address exists.
        const passwordMatches = await bcrypt.compare(
          password,
          emailMatches ? ADMIN_PASSWORD_HASH : DUMMY_HASH,
        );

        if (!emailMatches || !passwordMatches) return null;

        return { id: "admin", email: ADMIN_EMAIL, name: "Admin" };
      },
    }),
  ],
});
