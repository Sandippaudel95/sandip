import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/* The public site. Dark tokens are the document default, so this layout only
   adds the chrome; the admin panel opts out with `.theme-light`. */
export default function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
