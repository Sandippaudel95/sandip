import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Shared page scaffolding, so every section shares one rhythm and gutter.
   The 16px side gutter holds at phone width on every route. */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl px-4 sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}

export function Section({
  id,
  alt = false,
  className,
  children,
}: {
  id?: string;
  /** Tints the band, alternating against white as the old site did. */
  alt?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "relative scroll-mt-24 py-20 sm:py-24 lg:py-28",
        alt && "bg-surface",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeader({
  kicker,
  title,
  lede,
  className,
  /** Use 1 for the page's own title. Every page needs exactly one h1. */
  level = 2,
}: {
  kicker?: string;
  title: string;
  lede?: string;
  className?: string;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";

  return (
    <header className={cn("max-w-3xl", className)}>
      {kicker && <p className="pill-label">{kicker}</p>}
      <Heading className="mt-6 text-4xl leading-[1.1] font-normal tracking-tight sm:text-5xl">
        {title}
      </Heading>
      {lede && (
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground text-pretty">
          {lede}
        </p>
      )}
    </header>
  );
}
