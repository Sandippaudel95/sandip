"use client";

import { ArrowRight, CalendarX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";
import {
  BOOKING_WINDOW_DAYS,
  MINIMUM_NOTICE_HOURS,
  sessionLengths,
} from "@/content/availability";
import { addHours, formatDateKey, formatTime } from "@/lib/time";
import { Calendar } from "./Calendar";
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
        <legend className="text-sm font-semibold tracking-[0.12em] text-violet-light uppercase">
          Session length
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sessionLengths.map((h) => (
            <label
              key={h}
              className={cn(
                "cursor-pointer rounded-full border px-5 py-2.5 text-sm transition-colors",
                draft.durationHours === h
                  ? "border-violet bg-violet text-white"
                  : "border-input hover:border-violet/50 hover:bg-white/5",
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
          Up to 2 hours per person per day. Booking opens{" "}
          {MINIMUM_NOTICE_HOURS} hours ahead and runs {BOOKING_WINDOW_DAYS}{" "}
          days out.
        </p>
      </fieldset>

      {days.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <CalendarX
            className="mx-auto mb-3 size-7 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="font-medium">
            No {draft.durationHours}-hour slots are open in the next{" "}
            {BOOKING_WINDOW_DAYS} days.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.durationHours > 1
              ? "Try a 1-hour session, or email to arrange a time."
              : "New times open regularly. Email to arrange a time."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-8">
          <Calendar
            availableDates={days.map((d) => d.date)}
            selected={draft.date}
            onSelect={(date) => onChange({ date, timeSlot: "" })}
            windowDays={BOOKING_WINDOW_DAYS}
          />

          <div>
            <h3 className="text-sm font-semibold tracking-[0.12em] text-violet-light uppercase">
              {selectedDay ? "Start time" : "Pick a date"}
            </h3>

            {selectedDay ? (
              <>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {formatDateKey(selectedDay.date)} · all times Nepal time
                  (NPT)
                </p>
                <div
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                  role="radiogroup"
                  aria-label="Start time"
                >
                  {selectedDay.times.map((time) => {
                    const isSelected = draft.timeSlot === time;
                    return (
                      <label
                        key={time}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-colors",
                          isSelected
                            ? "border-violet bg-violet text-white"
                            : "border-input hover:border-violet/50 hover:bg-white/5",
                        )}
                      >
                        <input
                          type="radio"
                          name="timeSlot"
                          value={time}
                          checked={isSelected}
                          onChange={() => onChange({ timeSlot: time })}
                          className="sr-only"
                        />
                        <Clock
                          className={cn(
                            "size-4 shrink-0",
                            isSelected ? "text-white/70" : "text-violet-light",
                          )}
                          aria-hidden="true"
                        />
                        <span className="font-medium">
                          {formatTime(time)}
                        </span>
                        <span
                          className={cn(
                            "ml-auto text-xs",
                            isSelected
                              ? "text-white/70"
                              : "text-muted-foreground",
                          )}
                        >
                          to {formatTime(addHours(time, draft.durationHours))}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Choose a highlighted day in the calendar to see the times
                open on it.
              </p>
            )}
          </div>
        </div>
      )}

      <Button onClick={onNext} disabled={!canContinue} size="lg">
        Continue
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}
