import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_AVAILABILITY,
  type AvailabilityRules,
  type Weekday,
} from "@/content/availability";

/* The live booking rules, read from the database rather than the bundle.
   Everything that used to be a constant in src/content/availability.ts
   comes through here. */

/** Nepal-time "YYYY-MM-DD" for a plain DATE column, which Prisma hands
    back as midnight UTC. Using toISOString here is correct precisely
    because the column carries no zone. */
const dateKeyOf = (d: Date): string => d.toISOString().slice(0, 10);

/** Reject anything that is not "HH:mm", so a bad row cannot generate a
    slot that nepalToUtc will silently turn into an invalid date. */
const isTime = (v: unknown): v is string =>
  typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

function parseOpeningHours(raw: unknown): Partial<Record<Weekday, string[]>> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_AVAILABILITY.openingHours;
  }
  const out: Partial<Record<Weekday, string[]>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const day = Number(key);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!Array.isArray(value)) continue;
    const times = [...new Set(value.filter(isTime))].sort();
    if (times.length) out[day as Weekday] = times;
  }
  return out;
}

/**
 * Load the booking rules.
 *
 * Wrapped in React's cache so a single request that asks several times —
 * the booking page queries availability once per offered session length —
 * makes one round trip rather than one per call.
 */
export const getAvailabilitySettings = cache(
  async (): Promise<AvailabilityRules> => {
    try {
      const [row, blackouts] = await Promise.all([
        prisma.availabilitySetting.findUnique({ where: { id: "singleton" } }),
        prisma.blackoutDate.findMany({ orderBy: { date: "asc" } }),
      ]);

      if (!row) return DEFAULT_AVAILABILITY;

      const lengths = [...new Set(row.sessionLengths)]
        .filter((n) => Number.isInteger(n) && n > 0 && n <= 12)
        .sort((a, b) => a - b);

      return {
        openingHours: parseOpeningHours(row.openingHours),
        // An empty list would offer the client no session length at all and
        // strand them on step one, so fall back rather than render nothing.
        sessionLengths: lengths.length
          ? lengths
          : DEFAULT_AVAILABILITY.sessionLengths,
        minimumNoticeHours: Math.max(0, row.minimumNoticeHours),
        bookingWindowDays: Math.max(1, row.bookingWindowDays),
        maxHoursPerClientPerDay: Math.max(1, row.maxHoursPerClientPerDay),
        blackoutDates: blackouts.map((b) => dateKeyOf(b.date)),
      };
    } catch (err) {
      // A booking page that still works on yesterday's rules beats one that
      // 500s because the settings read failed.
      console.error("[availability] falling back to defaults:", err);
      return DEFAULT_AVAILABILITY;
    }
  },
);
