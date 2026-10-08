import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/schema";

/* The admin panel and the API are disallowed rather than merely
   noindexed: there is nothing there for a crawler, and a sign-in form
   in the index is an invitation. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
    host: SITE_URL,
  };
}
