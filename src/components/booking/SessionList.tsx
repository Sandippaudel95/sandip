"use client";

import { CalendarCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSession } from "@/lib/time";
import type { BookedSession } from "./BookingWizard";

/* The chosen days, shown the same way at every step so what is being paid
   for never has to be re-read in a different shape. */
export function SessionList({
  sessions,
  onRemove,
  className,
}: {
  sessions: BookedSession[];
  /** Omitted once the list is fixed, from the details step onwards. */
  onRemove?: (index: number) => void;
  className?: string;
}) {
  if (sessions.length === 0) return null;

  const totalHours = sessions.reduce((n, s) => n + s.durationHours, 0);
  const multi = sessions.length > 1;

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          <CalendarCheck className="size-4" aria-hidden="true" />
          {multi ? `${sessions.length} sessions` : "Your session"}
        </h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          {totalHours} hour{totalHours > 1 ? "s" : ""} in total
        </p>
      </div>

      <ul className="divide-y">
        {sessions.map((s, i) => (
          <li
            key={`${s.date}-${s.timeSlot}`}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className="min-w-0 flex-1 text-sm">
              {formatSession(s.date, s.timeSlot, s.durationHours)}
            </span>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove ${formatSession(s.date, s.timeSlot, s.durationHours)}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
