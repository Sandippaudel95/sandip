import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { profile } from "@/content/profile";
import "./globals.css";

/* Self-hosted by next/font, which removes the two Google Fonts preconnects
   and the render-blocking stylesheet the previous site carried. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const siteUrl = "https://sandipaudel.com.np";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${profile.name} | ${profile.role} and Research Consultant`,
    template: `%s | ${profile.name}`,
  },
  description:
    "Sandip Paudel: Assistant Professor of Finance at Lumbini Banijya Campus and PhD candidate at DDU Gorakhpur University. Research in financial econometrics and market efficiency, and research consultancy, thesis and paper review, data analysis and faculty training.",
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
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-navy focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
