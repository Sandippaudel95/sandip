"use client";

import { ArrowRight, CalendarX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";
import { addHours, formatDateKey, formatTime } from "@/lib/time";
import { Calendar } from "./Calendar";
import { SessionList } from "./SessionList";
import type { BookedSession, Draft } from "./BookingWizard";

/* Days first, then times.
 *
 * Choosing one date and immediately picking its time reads fine for a
 * single session, but it hides that more than one day is possible at all.
 * Picking the days up front makes the shape of the booking visible before
 * any time is chosen, and the time pickers below then follow the days in
 * order. */
export function StepDateTime({
  days,
  draft,
  onChange,
  onNext,
  sessionLengths,
  noticeHours,
  windowDays,
  maxHoursPerDay,
}: {
  days: DayAvailability[];
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onNext: () => void;
  /* The booking rules are admin-editable, so they are passed in from the
     server rather than imported: this component must not describe limits
     the server is no longer enforcing. */
  sessionLengths: number[];
  noticeHours: number;
  windowDays: number;
  maxHoursPerDay: number;
}) {
  const canContinue = draft.sessions.length > 0;
  const totalHours = draft.sessions.reduce((n, s) => n + s.durationHours, 0);

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const overlaps = (a: BookedSession, b: BookedSession) =>
    a.date === b.date &&
    toMin(a.timeSlot) < toMin(b.timeSlot) + b.durationHours * 60 &&
    toMin(b.timeSlot) < toMin(a.timeSlot) + a.durationHours * 60;

  const hoursOn = (date: string) =>
    draft.sessions
      .filter((s) => s.date === date)
      .reduce((n, s) => n + s.durationHours, 0);

  /** Dropping a day takes its chosen times with it. */
  const toggleDate = (date: string) => {
    const chosen = draft.selectedDates.includes(date);
    onChange({
      selectedDates: chosen
        ? draft.selectedDates.filter((d) => d !== date)
        : [...draft.selectedDates, date].sort(),
      sessions: chosen
        ? draft.sessions.filter((s) => s.date !== date)
        : draft.sessions,
    });
  };

  const toggleTime = (date: string, time: string) => {
    const existing = draft.sessions.findIndex(
      (s) => s.date === date && s.timeSlot === time,
    );
    if (existing >= 0) {
      onChange({
        sessions: draft.sessions.filter((_, i) => i !== existing),
      });
      return;
    }
    const candidate: BookedSession = {
      date,
      timeSlot: time,
      durationHours: draft.durationHours,
    };
    if (draft.sessions.some((s) => overlaps(s, candidate))) return;
    onChange({
      sessions: [...draft.sessions, candidate].sort((x, y) =>
        x.date === y.date
          ? x.timeSlot.localeCompare(y.timeSlot)
          : x.date.localeCompare(y.date),
      ),
    });
  };

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
          Session length
        </legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {sessionLengths.map((h: number) => (
            <label
              key={h}
              className={cn(
                "cursor-pointer rounded-full border px-5 py-3 text-sm transition-colors",
                draft.durationHours === h
                  ? "border-brand/30 bg-brand text-primary-foreground"
                  : "border-input hover:border-brand/30 hover:bg-accent/60",
              )}
            >
              <input
                type="radio"
                name="durationHours"
                value={h}
                checked={draft.durationHours === h}
                onChange={() =>
                  // Changing length invalidates everything chosen: a 2-hour
                  // session may not fit where a 1-hour one did.
                  onChange({ durationHours: h, selectedDates: [], sessions: [] })
                }
                className="sr-only"
              />
              {h} hour{h > 1 ? "s" : ""}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Up to {maxHoursPerDay} hour{maxHoursPerDay > 1 ? "s" : ""} per person
          per day. Booking opens {noticeHours} hours ahead and runs{" "}
          {windowDays} days out.
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
            {windowDays} days.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {draft.durationHours > 1
              ? "Try a shorter session, or email to arrange a time."
              : "New times open regularly. Email to arrange a time."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-8">
          <div>
            <h3 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              1. Choose your days
            </h3>
            <p className="mt-2 mb-3 text-sm text-muted-foreground">
              Pick one, or several for a longer piece of work.
            </p>
            <Calendar
              availableDates={days.map((d) => d.date)}
              selected={draft.selectedDates}
              onToggle={toggleDate}
              windowDays={windowDays}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              2. Choose a time on each day
            </h3>

            {draft.selectedDates.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                Choose a highlighted day in the calendar and its open times
                will appear here. All times are Nepal time (NPT).
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {draft.selectedDates.map((date) => {
                  const day = days.find((d) => d.date === date);
                  const booked = hoursOn(date);
                  const atCap = booked + draft.durationHours > maxHoursPerDay;

                  return (
                    <div key={date} className="rounded-xl border bg-card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="text-sm font-medium">
                          {formatDateKey(date)}
                        </h4>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {booked
                            ? `${booked} of ${maxHoursPerDay} hour${maxHoursPerDay > 1 ? "s" : ""} chosen`
                            : "No time chosen yet"}
                        </p>
                      </div>

                      <div
                        className="mt-3 grid gap-2 sm:grid-cols-2"
                        role="group"
                        aria-label={`Start times on ${formatDateKey(date)}`}
                      >
                        {(day?.times ?? []).map((time) => {
                          const picked = draft.sessions.some(
                            (s) => s.date === date && s.timeSlot === time,
                          );
                          const candidate: BookedSession = {
                            date,
                            timeSlot: time,
                            durationHours: draft.durationHours,
                          };
                          const clashes =
                            !picked &&
                            (atCap ||
                              draft.sessions.some((s) =>
                                overlaps(s, candidate),
                              ));

                          return (
                            <label
                              key={time}
                              className={cn(
                                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                                picked &&
                                  "border-brand/30 bg-brand text-primary-foreground",
                                clashes &&
                                  "cursor-not-allowed border-input opacity-40",
                                !picked &&
                                  !clashes &&
                                  "cursor-pointer border-input hover:border-brand/30 hover:bg-accent/60",
                              )}
                            >
                              <input
                                type="checkbox"
                                value={time}
                                checked={picked}
                                disabled={clashes}
                                onChange={() => toggleTime(date, time)}
                                className="sr-only"
                              />
                              <Clock
                                className={cn(
                                  "size-4 shrink-0",
                                  picked
                                    ? "text-primary-foreground/70"
                                    : "text-brand",
                                )}
                                aria-hidden="true"
                              />
                              <span className="font-medium">
                                {formatTime(time)}
                              </span>
                              <span
                                className={cn(
                                  "ml-auto text-xs",
                                  picked
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground",
                                )}
                              >
                                to{" "}
                                {formatTime(
                                  addHours(time, draft.durationHours),
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <SessionList
        sessions={draft.sessions}
        onRemove={(i) =>
          onChange({ sessions: draft.sessions.filter((_, n) => n !== i) })
        }
      />

      <Button onClick={onNext} disabled={!canContinue} size="lg">
        Continue
        {totalHours > 0 && (
          <span className="opacity-80">
            with {totalHours} hour{totalHours > 1 ? "s" : ""}
          </span>
        )}
        <ArrowRight aria-hidden="true" />
      </Button>
    </div>
  );
}
