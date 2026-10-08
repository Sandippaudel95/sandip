import type { MetadataRoute } from "next";
import { services } from "@/content/services";
import { SITE_URL } from "@/lib/schema";

/* Generated from the same content array the pages are, so a new service
   cannot appear on the site and be missing from the sitemap.

   Admin routes are absent deliberately: they are noindex, behind auth,
   and listing them would only advertise them. */
/* next.config sets trailingSlash, so every canonical ends in one. The
   sitemap has to agree: the same page listed two ways is two URLs as
   far as a crawler is concerned, and it will pick one of them itself. */
const canonical = (path: string) => {
  const u = new URL(path, SITE_URL);
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.toString();
};

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "monthly"],
    ["/consulting", 0.9, "monthly"],
    ["/book", 0.9, "weekly"],
    ["/research", 0.8, "monthly"],
    ["/research/conferences", 0.6, "yearly"],
  ];

  return [
    ...pages.map(([path, priority, changeFrequency]) => ({
      url: canonical(path),
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...services.map((s) => ({
      url: canonical(`/consulting/${s.id}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
