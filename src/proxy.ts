import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/* Route protection for /admin.
 *
 * This runs on the Edge runtime, so it uses authConfig only: the Credentials
 * provider in lib/auth.ts pulls in bcrypt, which is Node-only and would fail
 * to build here. Reading the JWT needs no provider.
 *
 * This is a first line of defence, not the only one. Pages under /admin also
 * check the session server-side, because a misconfigured matcher would
 * otherwise silently expose the dashboard. */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // The sign-in page has to stay reachable while signed out.
  if (pathname.startsWith("/admin/login")) return;

  if (!req.auth) {
    return Response.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
