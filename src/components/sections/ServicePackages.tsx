import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { services } from "@/content/services";

/* Driven entirely by src/content/services.ts: editing that array is all it
   takes to change this page. */
export function ServicePackages() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {services.map((pkg) => (
        <article
          key={pkg.id}
          id={pkg.id}
          className={cn(
            "relative flex scroll-mt-24 flex-col rounded-2xl border bg-card p-6 sm:p-7",
            pkg.featured && "border-brand/30 ring-1 ring-brand/30",
          )}
        >
          {/* Taken out of flow so the badge does not push this card's
              content down relative to the others in the row. */}
          {pkg.featured && (
            <Badge className="absolute -top-3 left-6 bg-brand text-primary-foreground hover:bg-brand/85 sm:left-7">
              Start here
            </Badge>
          )}

          {/* Two-line floor: some names wrap at 3-up, some do not. */}
          <h3 className="text-xl font-semibold tracking-tight lg:min-h-[3.5rem]">
            {pkg.name}
          </h3>

          {/* Floor sized to the longest summary (4 lines at 3-up), so the
              price band lines up across a row. Raise it if a summary grows. */}
          <p className="mt-3 leading-relaxed text-muted-foreground text-pretty sm:min-h-[6.5rem]">
            {pkg.summary}
          </p>

          <div className="mt-4 border-y py-3">
            <p className="font-display text-lg font-semibold text-brand">
              {pkg.price}
            </p>
            {pkg.priceNote && (
              <p className="mt-1 text-sm text-muted-foreground">
                {pkg.priceNote}
              </p>
            )}
          </div>

          <div className="mt-5">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
              Who it is for
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {pkg.audience}
            </p>
          </div>

          <div className="mt-5 mb-5">
            <h4 className="text-xs font-semibold tracking-[0.12em] text-brand uppercase">
              What is included
            </h4>
            <ul className="mt-3 space-y-2">
              {pkg.includes.map((line) => (
                <li key={line} className="flex gap-3 text-sm leading-relaxed">
                  <Check
                    className="mt-1 size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-auto border-t pt-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Engagement:</span>{" "}
            {pkg.format}
          </p>

          <Button
            asChild
            variant={pkg.featured ? "default" : "outline"}
            className="mt-5 w-full"
          >
            <Link href="/book">
              Discuss this package
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </article>
      ))}
    </div>
  );
}
