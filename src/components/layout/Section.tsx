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
        "scroll-mt-20 py-16 sm:py-20 lg:py-24",
        alt && "bg-muted/50",
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
}: {
  kicker?: string;
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <header className={cn("max-w-3xl", className)}>
      {kicker && (
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {kicker}
        </p>
      )}
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {lede && (
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {lede}
        </p>
      )}
    </header>
  );
}
