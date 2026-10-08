import { addDays, weekdayOf } from "./time";

/* Generating the dates of a repeating engagement.

   Kept out of the Server Action module because Next requires every
   export from a "use server" file to be an async function, and this is
   plain arithmetic that both the action and its preview need. */

export type RunPattern = "daily" | "weekdays" | "weekly";

export interface RunDatePreview {
  date: string;
  clashes: boolean;
}

/**
 * The dates a repeat produces.
 *
 * Weekdays skips Saturday, the one day the published hours close. The
 * count is how many sessions are wanted, not how many days are stepped
 * over, so asking for 15 weekday sessions gives 15 of them rather than
 * however many fall inside 15 days.
 */
export function runDates(
  start: string,
  pattern: RunPattern,
  count: number,
): string[] {
  const out: string[] = [];
  let cursor = start;
  // Bounded so a bad pattern cannot spin: 60 sessions is the cap, and
  // weekly over 60 sessions never needs more than a few hundred steps.
  for (let guard = 0; out.length < count && guard < 500; guard += 1) {
    if (pattern !== "weekdays" || weekdayOf(cursor) !== 6) out.push(cursor);
    cursor = addDays(cursor, pattern === "weekly" ? 7 : 1);
  }
  return out;
}
