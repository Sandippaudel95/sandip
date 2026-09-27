"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { addDays, nepalDateKey } from "@/lib/time";

/* Month grid of bookable days.

   Only dates with at least one free slot are selectable. Navigation is
   bounded by the current month and the last month the booking window
   reaches, so there is nowhere empty to wander to. */

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const monthLabel = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});

const fullDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "YYYY-MM" for a date key. */
const monthOf = (dateKey: string) => dateKey.slice(0, 7);

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function Calendar({
  availableDates,
  selected,
  onSelect,
  windowDays,
}: {
  /** Date keys that have at least one free start time. */
  availableDates: string[];
  selected: string;
  onSelect: (date: string) => void;
  windowDays: number;
}) {
  const today = nepalDateKey();
  const lastDate = addDays(today, windowDays);

  const available = useMemo(
    () => new Set(availableDates),
    [availableDates],
  );

  // Open on the month holding the selection, else the first free date,
  // else this month.
  const initial = monthOf(selected || availableDates[0] || today);
  const [view, setView] = useState(initial);

  const [vy, vm] = view.split("-").map(Number);
  const viewYear = vy;
  const viewMonthIndex = vm - 1;

  const firstWeekday = new Date(
    Date.UTC(viewYear, viewMonthIndex, 1),
  ).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(viewYear, viewMonthIndex + 1, 0),
  ).getUTCDate();

  const canGoBack = view > monthOf(today);
  const canGoForward = view < monthOf(lastDate);

  function shift(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonthIndex + delta, 1));
    setView(monthKey(next.getUTCFullYear(), next.getUTCMonth()));
  }

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${view}-${String(i + 1).padStart(2, "0")}`,
    ),
  ];

  return (
    <div className="panel p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="grid size-9 place-items-center rounded-full border transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>

        <h3 aria-live="polite" className="font-display text-base font-semibold">
          {monthLabel.format(new Date(Date.UTC(viewYear, viewMonthIndex, 1)))}
        </h3>

        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Next month"
          className="grid size-9 place-items-center rounded-full border transition-colors hover:bg-white/10 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        className="mt-4 grid grid-cols-7 gap-1 text-center"
        aria-hidden="true"
      >
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            className="py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
          >
            {d.slice(0, 1)}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <span key={`pad-${i}`} />;

          const day = Number(date.slice(-2));
          const isOpen = available.has(date);
          const isSelected = date === selected;
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              disabled={!isOpen}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${fullDate.format(
                new Date(Date.UTC(viewYear, viewMonthIndex, day)),
              )}${isOpen ? "" : ", not available"}`}
              className={cn(
                "relative aspect-square rounded-md text-sm transition-colors",
                isSelected && "bg-violet font-medium text-white",
                !isSelected && isOpen && "font-medium text-foreground hover:bg-white/10",
                !isOpen && "text-muted-foreground/30",
                isToday && !isSelected && "ring-1 ring-violet/50",
              )}
            >
              {day}
              {isOpen && !isSelected && (
                <span
                  className="absolute inset-x-0 bottom-1.5 mx-auto size-1 rounded-full bg-violet"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span
          className="size-1.5 rounded-full bg-violet"
          aria-hidden="true"
        />
        Days with open times
      </p>
    </div>
  );
}
