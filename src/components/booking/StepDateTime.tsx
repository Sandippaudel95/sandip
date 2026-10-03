"use client";

import { ArrowRight, CalendarPlus, CalendarX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";
import { addHours, formatDateKey, formatTime } from "@/lib/time";
import { Calendar } from "./Calendar";
import { SessionList } from "./SessionList";
import type { BookedSession, Draft } from "./BookingWizard";

export function StepDateTime({
  days,
  draft,
  onChange,
  onNext,
  sessionLengths,
  noticeHours,
  windowDays,
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
}) {
  const selectedDay = days.find((d) => d.date === draft.date);
  const canContinue = draft.sessions.length > 0;
  const totalHours = draft.sessions.reduce((n, s) => n + s.durationHours, 0);

  const overlaps = (a: BookedSession, b: BookedSession) => {
    if (a.date !== b.date) return false;
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const [aS, bS] = [toMin(a.timeSlot), toMin(b.timeSlot)];
    return (
      aS < bS + b.durationHours * 60 && bS < aS + a.durationHours * 60
    );
  };

  /* Picking a time commits it. The alternative — select, then press Add —
     makes the single-session case, which is almost everyone, two clicks
     longer for no gain. */
  const addSession = (time: string) => {
    const candidate: BookedSession = {
      date: draft.date,
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

  const removeSession = (i: number) =>
    onChange({ sessions: draft.sessions.filter((_, n) => n !== i) });

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
                  // Changing length invalidates the chosen slot: a 2-hour
                  // session may not fit where a 1-hour one did.
                  onChange({ durationHours: h, date: "" })
                }
                className="sr-only"
              />
              {h} hour{h > 1 ? "s" : ""}
            </label>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Booking opens{" "}
          {noticeHours} hours ahead and runs {windowDays}{" "}
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
            {windowDays} days.
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
            onSelect={(date) => onChange({ date })}
            windowDays={windowDays}
          />

          <div>
            <h3 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
              {selectedDay ? "Start time" : "Pick a date"}
            </h3>

            {selectedDay ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatDateKey(selectedDay.date)} · all times Nepal time
                  (NPT)
                </p>
                <div
                  className="mt-4 grid gap-2 sm:grid-cols-2"
                  role="group"
                  aria-label="Start time"
                >
                  {selectedDay.times.map((time) => {
                    const candidate: BookedSession = {
                      date: selectedDay.date,
                      timeSlot: time,
                      durationHours: draft.durationHours,
                    };
                    const isSelected = draft.sessions.some(
                      (sn) =>
                        sn.date === candidate.date &&
                        sn.timeSlot === time &&
                        sn.durationHours === candidate.durationHours,
                    );
                    const clashes =
                      !isSelected &&
                      draft.sessions.some((sn) => overlaps(sn, candidate));
                    return (
                      <label
                        key={time}
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                          isSelected &&
                            "border-brand/30 bg-brand text-primary-foreground",
                          clashes &&
                            "cursor-not-allowed border-input opacity-40",
                          !isSelected &&
                            !clashes &&
                            "cursor-pointer border-input hover:border-brand/30 hover:bg-accent/60",
                        )}
                      >
                        <input
                          type="checkbox"
                          value={time}
                          checked={isSelected}
                          disabled={clashes}
                          onChange={() =>
                            isSelected
                              ? removeSession(
                                  draft.sessions.findIndex(
                                    (sn) =>
                                      sn.date === candidate.date &&
                                      sn.timeSlot === time,
                                  ),
                                )
                              : addSession(time)
                          }
                          className="sr-only"
                        />
                        <Clock
                          className={cn(
                            "size-4 shrink-0",
                            isSelected ? "text-primary-foreground/70" : "text-brand",
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
                              ? "text-primary-foreground/70"
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

      <SessionList sessions={draft.sessions} onRemove={removeSession} />

      {canContinue && (
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <CalendarPlus
            className="mt-0.5 size-4 shrink-0 text-brand"
            aria-hidden="true"
          />
          Need more time? Pick another date and time above to add a second
          session to this booking. You pay for all of them together.
        </p>
      )}

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
