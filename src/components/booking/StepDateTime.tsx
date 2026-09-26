"use client";

import { ArrowRight, CalendarX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";
import { sessionLengths } from "@/content/availability";
import { formatDateKey, formatTime, addHours } from "@/lib/time";
import type { Draft } from "./BookingWizard";

export function StepDateTime({
  days,
  draft,
  onChange,
  onNext,
}: {
  days: DayAvailability[];
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onNext: () => void;
}) {
  const selectedDay = days.find((d) => d.date === draft.date);
  const canContinue = Boolean(draft.date && draft.timeSlot);

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
          Session length
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sessionLengths.map((h) => (
            <label
              key={h}
              className={cn(
                "cursor-pointer rounded-md border px-4 py-2.5 text-sm transition-colors",
                draft.durationHours === h
                  ? "border-navy bg-navy text-white"
                  : "hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="durationHours"
                value={h}
                checked={draft.durationHours === h}
                onChange={() =>
                  // Changing length invalidates the chosen slot: a 2-hour
                  // session may not fit where a 1-hour one did.
                  onChange({ durationHours: h, date: "", timeSlot: "" })
                }
                className="sr-only"
              />
              {h} hour{h > 1 ? "s" : ""}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Up to 2 hours per person per day.
        </p>
      </fieldset>

      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CalendarX
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">
            No {draft.durationHours}-hour slots are open at the moment.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.durationHours > 1
              ? "Try a 1-hour session, or email to arrange a time."
              : "New times open regularly. Email to arrange a time."}
          </p>
        </div>
      ) : (
        <>
          <fieldset>
            <legend className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
              Date
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {days.slice(0, 21).map((day) => (
                <label
                  key={day.date}
                  className={cn(
                    "cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors",
                    draft.date === day.date
                      ? "border-navy bg-navy text-white"
                      : "hover:bg-muted",
                  )}
                >
                  <input
                    type="radio"
                    name="date"
                    value={day.date}
                    checked={draft.date === day.date}
                    onChange={() =>
                      onChange({ date: day.date, timeSlot: "" })
                    }
                    className="sr-only"
                  />
                  {formatDateKey(day.date).replace(/,? \d{4}$/, "")}
                </label>
              ))}
            </div>
          </fieldset>

          {selectedDay && (
            <fieldset>
              <legend className="text-sm font-semibold tracking-[0.12em] text-navy uppercase">
                Start time
              </legend>
              <p className="mt-1 text-sm text-muted-foreground">
                All times are Nepal time (NPT).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedDay.times.map((time) => (
                  <label
                    key={time}
                    className={cn(
                      "cursor-pointer rounded-md border px-3.5 py-2.5 text-sm transition-colors",
                      draft.timeSlot === time
                        ? "border-navy bg-navy text-white"
                        : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name="timeSlot"
                      value={time}
                      checked={draft.timeSlot === time}
                      onChange={() => onChange({ timeSlot: time })}
                      className="sr-only"
                    />
                    {formatTime(time)}
                    <span
                      className={cn(
                        "ml-1.5 text-xs",
                        draft.timeSlot === time
                          ? "text-white/70"
                          : "text-muted-foreground",
                      )}
                    >
                      to {formatTime(addHours(time, draft.durationHours))}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}

      <Button onClick={onNext} disabled={!canContinue} size="lg">
        Continue
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}
