import { Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conference } from "@/content/types";

/* Shared by the /research highlights and the full /research/conferences
   listing, so the two never drift apart. */
export function ConferenceCard({ item }: { item: Conference }) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-lg border bg-card p-5",
        item.award && "border-navy/25 bg-accent/40",
      )}
    >
      {item.award && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-navy uppercase">
          <Award className="size-3.5" aria-hidden="true" />
          {item.award}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{item.date}</p>

      <h3 className="mt-1.5 text-base leading-snug font-semibold">
        {item.paper}
      </h3>

      <div className="mt-auto pt-3 text-sm">
        <p className="font-medium text-navy">{item.conference}</p>
        <p className="mt-0.5 text-muted-foreground">{item.venue}</p>
      </div>
    </article>
  );
}
