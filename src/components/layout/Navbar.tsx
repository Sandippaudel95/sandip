"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, Briefcase, CalendarCheck, Home, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/research", label: "Research", Icon: BookOpen },
  { href: "/consulting", label: "Services", Icon: Briefcase },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Thin border appears once the page moves, as on the previous site.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-colors",
        scrolled
          ? "border-b bg-background/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span
            className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-brand/30 to-brand text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            SP
          </span>
          <span className="font-display text-lg font-medium tracking-tight">
            Sandip Paudel
          </span>
        </Link>

        {/* Desktop */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-1 md:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.Icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
          <ThemeToggle className="ml-2" />
          <Button
            asChild
            className="ml-2 bg-brand text-primary-foreground hover:bg-brand/90"
          >
            <Link href="/book">
              <CalendarCheck aria-hidden="true" />
              Book a Consultation
            </Link>
          </Button>
        </nav>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(20rem,85vw)]">
            <SheetHeader>
              <SheetTitle className="font-display">Menu</SheetTitle>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-xl px-4 py-3 text-base transition-colors",
                    isActive(item.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  <item.Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-4 bg-brand text-primary-foreground hover:bg-brand/90">
                <Link href="/book" onClick={() => setOpen(false)}>
                  <CalendarCheck aria-hidden="true" />
                  Book a Consultation
                </Link>
              </Button>

              <div className="mt-6 border-t pt-6">
                <p className="mb-3 text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Appearance
                </p>
                <ThemeToggle />
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
