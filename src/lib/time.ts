import { TIMEZONE } from "@/content/availability";

/* ==========================================================================
   Nepal time helpers.

   The database stores UTC instants. Clients and the admin both think in
   Nepal time (UTC+05:45). Everything that crosses that boundary goes through
   this file, so the offset is never hardcoded or applied twice.
   ========================================================================== */

/** Minutes that `tz` is ahead of UTC at the given instant. */
export function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(at)
    .reduce<Record<string, string>>((acc, p) => {
      acc[p.type] = p.value;
      return acc;
    }, {});

  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
  );

  return Math.round((asUtc - at.getTime()) / 60000);
}

/**
 * Turn a Nepal-time wall clock into the UTC instant it refers to.
 *
 * `dateStr` is "YYYY-MM-DD" and `time` is "HH:mm", both as the client sees
 * them. Solved in two passes so the helper stays correct for zones with DST,
 * even though Nepal has none.
 */
export function nepalToUtc(dateStr: string, time: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);

  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let instant = new Date(naive - tzOffsetMinutes(TIMEZONE, new Date(naive)) * 60000);
  // Re-solve against the real instant, in case the first guess landed on the
  // far side of an offset change.
  instant = new Date(naive - tzOffsetMinutes(TIMEZONE, instant) * 60000);

  return instant;
}

/** "YYYY-MM-DD" for an instant, as seen in Nepal. */
export function nepalDateKey(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Weekday index (0 = Sunday) of a "YYYY-MM-DD" key. */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Add whole days to a "YYYY-MM-DD" key. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "Monday 5 October 2026" from a "YYYY-MM-DD" key. */
export function formatDateKey(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return dayFormatter.format(new Date(Date.UTC(y, m - 1, d)));
}

/** "10:00" to "10:00 AM". */
export function formatTime(time: string): string {
  const [hh, mm] = time.split(":").map(Number);
  const suffix = hh < 12 ? "AM" : "PM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

/** "10:00" plus whole hours, as "HH:mm". */
export function addHours(time: string, hours: number): string {
  const [hh, mm] = time.split(":").map(Number);
  return `${String(hh + hours).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** "Monday 5 October 2026, 10:00 AM to 12:00 PM (Nepal time)". */
export function formatSession(
  dateStr: string,
  time: string,
  durationHours: number,
): string {
  return `${formatDateKey(dateStr)}, ${formatTime(time)} to ${formatTime(
    addHours(time, durationHours),
  )} (Nepal time)`;
}
