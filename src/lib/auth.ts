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

        // A bcrypt hash is 60 characters and starts with $2a/$2b/$2y. Next
        // expands $NAME in .env files, so an unescaped hash arrives
        // truncated and every sign-in fails for no visible reason. Say so
        // rather than leaving it to look like a wrong password.
        if (!/^\$2[aby]\$\d{2}\$.{53}$/.test(ADMIN_PASSWORD_HASH)) {
          console.error(
            "[auth] ADMIN_PASSWORD_HASH is not a valid bcrypt hash (got " +
              ADMIN_PASSWORD_HASH.length +
              " chars, expected 60). In .env files each $ must be escaped as \$ " +
              "because Next.js expands $NAME. Refusing all sign-ins.",
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
