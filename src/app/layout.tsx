import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { profile } from "@/content/profile";
import { JsonLd, SITE_URL, personSchema, professionalServiceSchema } from "@/lib/schema";
import "./globals.css";

/* Self-hosted by next/font. Outfit stands in for the reference site's
   Aeonik, which is commercially licensed: both are geometric sans faces
   that hold up at large sizes in light weights. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

/* www, not the apex: the apex 308s here, so canonicals pointing at the
   apex were naming a URL that redirects. Imported so the value is
   stated once, next to the structured data that also needs it. */
const siteUrl = SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} | ${profile.role} and Research Consultant`,
    template: `%s | ${profile.name}`,
  },
  description:
    "Sandip Paudel: Assistant Professor of Finance at Lumbini Banijya Campus and PhD candidate at DDUG University. Research in financial econometrics and market efficiency, and research consultancy, thesis and paper review, data analysis and faculty training.",
  authors: [{ name: profile.name }],
  keywords: [
    "financial econometrics",
    "market efficiency",
    "NEPSE",
    "research consultant Nepal",
    "thesis review Nepal",
    "data analysis for research",
    "research training faculty Nepal",
  ],
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: profile.name,
    title: `${profile.name} | ${profile.role} and Research Consultant`,
    description: profile.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: `${profile.name} | ${profile.role} and Research Consultant`,
    description: profile.tagline,
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <JsonLd schema={[personSchema(), professionalServiceSchema()]} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
