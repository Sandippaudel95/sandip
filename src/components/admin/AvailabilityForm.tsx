"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarOff, Check, Loader2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SELECTABLE_TIMES,
  WEEKDAY_NAMES,
  type AvailabilityRules,
  type Weekday,
} from "@/content/availability";
import { formatDateKey, formatTime } from "@/lib/time";
import {
  addBlackoutDate,
  removeBlackoutDate,
  saveAvailability,
} from "@/app/admin/availability/actions";

const DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const LENGTH_CHOICES = [1, 2, 3, 4, 5, 6, 8];

/* A grid of hour toggles rather than start/end pickers: the real schedule
   has a hole in it over lunch, which a range cannot express. */
export function AvailabilityForm({
  rules,
  blackouts,
}: {
  rules: AvailabilityRules;
  blackouts: { id: string; date: string; reason: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // Held locally so toggling reads instantly and the whole week can be
  // rearranged before anything is written.
  const [hours, setHours] = useState<Record<Weekday, string[]>>(() => {
    const seed = {} as Record<Weekday, string[]>;
    for (const d of DAYS) seed[d] = rules.openingHours[d] ?? [];
    return seed;
  });
  const [lengths, setLengths] = useState<number[]>(rules.sessionLengths);

  const toggle = (day: Weekday, time: string) =>
    setHours((h) => ({
      ...h,
      [day]: h[day].includes(time)
        ? h[day].filter((t) => t !== time)
        : [...h[day], time].sort(),
    }));

  function submit(formData: FormData) {
    setMessage(null);
    for (const d of DAYS) {
      for (const t of hours[d]) formData.append(`day-${d}`, t);
    }
    for (const l of lengths) formData.append("sessionLengths", String(l));
    start(async () => {
      const res = await saveAvailability(formData);
      setFailed(!res.ok);
      setMessage(res.message ?? null);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-10">
      <form action={submit} className="space-y-10">
        <section>
          <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
            Opening hours
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tick the hours a session may start. A day with nothing ticked is
            closed. All times are Nepal time.
          </p>

          <div className="mt-5 space-y-3">
            {DAYS.map((day) => (
              <div
                key={day}
                className="rounded-xl border bg-card p-4 sm:flex sm:items-start sm:gap-4"
              >
                <div className="sm:w-28 sm:shrink-0">
                  <p className="font-medium">{WEEKDAY_NAMES[day]}</p>
                  <p className="text-xs text-muted-foreground">
                    {hours[day].length
                      ? `${hours[day].length} hour${hours[day].length > 1 ? "s" : ""}`
                      : "Closed"}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 sm:mt-0">
                  {SELECTABLE_TIMES.map((time) => {
                    const on = hours[day].includes(time);
                    return (
                      <button
                        key={time}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(day, time)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs tabular-nums transition-colors",
                          on
                            ? "border-brand/30 bg-brand text-primary-foreground"
                            : "border-input text-muted-foreground hover:border-brand/30 hover:bg-accent/60",
                        )}
                      >
                        {formatTime(time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold tracking-[0.12em] text-brand uppercase">
            Rules
          </h2>

          <fieldset className="mt-5">
            <legend className="text-sm font-medium">
              Session lengths a client may choose
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {LENGTH_CHOICES.map((h) => {
                const on = lengths.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setLengths((l) =>
                        l.includes(h)
                          ? l.filter((x) => x !== h)
                          : [...l, h].sort((a, b) => a - b),
                      )
                    }
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition-colors",
                      on
                        ? "border-brand/30 bg-brand text-primary-foreground"
                        : "border-input text-muted-foreground hover:border-brand/30 hover:bg-accent/60",
                    )}
                  >
                    {h} hour{h > 1 ? "s" : ""}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <NumberField
              name="minimumNoticeHours"
              label="Notice required"
              suffix="hours"
              defaultValue={rules.minimumNoticeHours}
              hint="Nothing may be booked sooner than this."
              min={0}
              max={720}
            />
            <NumberField
              name="bookingWindowDays"
              label="Booking window"
              suffix="days"
              defaultValue={rules.bookingWindowDays}
              hint="How far ahead the calendar opens."
              min={1}
              max={365}
            />
            <NumberField
              name="maxHoursPerClientPerDay"
              label="Max per person"
              suffix="hours/day"
              defaultValue={rules.maxHoursPerClientPerDay}
              hint="Across every booking they hold that day."
              min={1}
              max={24}
            />
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            Save availability
          </Button>
          {message && (
            <p
              role="status"
              className={cn(
                "flex items-center gap-2 text-sm",
                failed ? "text-destructive" : "text-success",
              )}
            >
              {failed ? (
                <AlertCircle className="size-4" aria-hidden="true" />
              ) : (
                <Check className="size-4" aria-hidden="true" />
              )}
              {message}
            </p>
          )}
        </div>
      </form>

      <BlackoutDates blackouts={blackouts} />
    </div>
  );
}

function NumberField({
  name,
  label,
  suffix,
  defaultValue,
  hint,
  min,
  max,
}: {
  name: string;
  label: string;
  suffix: string;
  defaultValue: number;
  hint: string;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={name}
          name={name}
          type="number"
          inputMode="numeric"
          defaultValue={defaultValue}
          min={min}
          max={max}
          required
          className="w-24 rounded-md border bg-background px-3 py-2 text-sm tabular-nums focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

function BlackoutDates({
  blackouts,
}: {
  blackouts: { id: string; date: string; reason: string | null }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-brand uppercase">
        <CalendarOff className="size-4" aria-hidden="true" />
        Closed dates
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Holidays and travel. These close the whole day, whatever its opening
        hours say. Existing bookings on a closed date are not cancelled.
      </p>

      <form
        action={(fd) =>
          start(async () => {
            const res = await addBlackoutDate(fd);
            setMessage(res.message ?? null);
            if (res.ok) router.refresh();
          })
        }
        className="mt-5 flex flex-wrap items-end gap-3"
      >
        <div>
          <label htmlFor="blackout-date" className="block text-sm font-medium">
            Date
          </label>
          <input
            id="blackout-date"
            name="date"
            type="date"
            required
            className="mt-2 rounded-md border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </div>
        <div className="min-w-48 flex-1">
          <label htmlFor="blackout-reason" className="block text-sm font-medium">
            Reason <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            id="blackout-reason"
            name="reason"
            type="text"
            maxLength={120}
            placeholder="e.g. Dashain"
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-2 focus:outline-offset-1 focus:outline-ring"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Plus aria-hidden="true" />
          )}
          Close this date
        </Button>
      </form>

      {message && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {message}
        </p>
      )}

      {blackouts.length > 0 ? (
        <ul className="mt-5 divide-y rounded-xl border bg-card">
          {blackouts.map((b) => (
            <li
              key={b.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{formatDateKey(b.date)}</p>
                {b.reason && (
                  <p className="text-xs text-muted-foreground">{b.reason}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                onClick={() =>
                  start(async () => {
                    await removeBlackoutDate(b.id);
                    router.refresh();
                  })
                }
              >
                <X aria-hidden="true" />
                Reopen
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No closed dates.
        </p>
      )}
    </section>
  );
}
