import { Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conference } from "@/content/types";

/* Shared by the /research highlights and the full /research/conferences
   listing, so the two never drift apart.

   Most entries lead with the paper title. Where no title is recorded the
   event name becomes the heading instead. */
export function ConferenceCard({ item }: { item: Conference }) {
  const hasPaper = Boolean(item.paper);

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-white/[0.035] p-5",
        item.award && "border-violet/30 bg-accent/40",
      )}
    >
      {item.award && (
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-violet-light uppercase">
          <Award className="size-3.5" aria-hidden="true" />
          {item.award}
        </p>
      )}

      <p className="text-sm text-muted-foreground">{item.date}</p>

      <h3 className="mt-1.5 text-base leading-snug font-semibold">
        {item.paper ?? item.conference}
      </h3>

      <div className="mt-auto pt-3 text-sm">
        {hasPaper && (
          <p className="font-medium text-violet-light">{item.conference}</p>
        )}
        {item.track && (
          <p className={cn("text-muted-foreground", hasPaper && "mt-0.5")}>
            Track: {item.track}
          </p>
        )}
        <p className="mt-0.5 text-muted-foreground">{item.venue}</p>
      </div>
    </article>
  );
}
