import { prisma } from "@/lib/prisma";
import {
  BOOKING_WINDOW_DAYS,
  MAX_HOURS_PER_CLIENT_PER_DAY,
  MINIMUM_NOTICE_HOURS,
  blackoutDates,
  openingHours,
  type Weekday,
} from "@/content/availability";
import { addDays, addHours, nepalDateKey, nepalToUtc, weekdayOf } from "./time";

/* Availability is the configured opening hours minus anything already
   booked, minus anything inside the notice window. There is no slot table:
   see src/content/availability.ts. */

export interface DayAvailability {
  /** "YYYY-MM-DD" in Nepal time. */
  date: string;
  /** Start times still bookable for the requested length. */
  times: string[];
}

/** Start times configured for a date, before subtracting bookings. */
export function configuredTimes(dateStr: string): string[] {
  if (blackoutDates.includes(dateStr)) return [];
  return openingHours[weekdayOf(dateStr) as Weekday] ?? [];
}

/** The earliest instant a session may start. */
export function earliestStart(): Date {
  return new Date(Date.now() + MINIMUM_NOTICE_HOURS * 3600_000);
}

/** The last date the calendar offers. */
export function lastBookableDate(): string {
  return addDays(nepalDateKey(), BOOKING_WINDOW_DAYS);
}

/**
 * Free start times across the booking window for a given session length.
 *
 * A slot is offered only when every hour it spans is free, so a 2-hour
 * session is never offered against a single free hour.
 */
export async function getAvailability(
  durationHours: number,
): Promise<DayAvailability[]> {
  const from = nepalDateKey();
  const to = lastBookableDate();
  const cutoff = earliestStart();

  const booked = await prisma.booking.findMany({
    where: {
      bookingStatus: { not: "CANCELLED" },
      startsAt: { gte: new Date() },
    },
    select: { startsAt: true, endsAt: true },
  });

  const days: DayAvailability[] = [];

  for (let d = from; d <= to; d = addDays(d, 1)) {
    const times = configuredTimes(d).filter((time) => {
      const start = nepalToUtc(d, time);
      const end = nepalToUtc(d, addHours(time, durationHours));

      if (start < cutoff) return false;

      // The whole span must be clear of every non-cancelled booking.
      const clashes = booked.some((b) => start < b.endsAt && end > b.startsAt);
      if (clashes) return false;

      // The span must also stay inside the configured hours: every hour it
      // covers has to be an offered start time.
      for (let h = 1; h < durationHours; h += 1) {
        if (!configuredTimes(d).includes(addHours(time, h))) return false;
      }

      return true;
    });

    if (times.length) days.push({ date: d, times });
  }

  return days;
}

/** Anything with a `booking` delegate: the global client or a transaction. */
type Db = Pick<typeof prisma, "booking">;

/**
 * Hours this email already holds on a date, ignoring cancelled bookings.
 *
 * Pass the transaction client when checking the cap before an insert, so the
 * read and the write share one connection.
 */
export async function hoursBookedBy(
  clientEmail: string,
  dateStr: string,
  db: Db = prisma,
): Promise<number> {
  const [y, m, d] = dateStr.split("-").map(Number);
  const rows = await db.booking.findMany({
    where: {
      clientEmail: { equals: clientEmail, mode: "insensitive" },
      date: new Date(Date.UTC(y, m - 1, d)),
      bookingStatus: { not: "CANCELLED" },
    },
    select: { durationHours: true },
  });
  return rows.reduce((sum, r) => sum + r.durationHours, 0);
}

export function dailyCapMessage(already: number): string {
  return `You already have ${already} hour${already === 1 ? "" : "s"} booked that day. A maximum of ${MAX_HOURS_PER_CLIENT_PER_DAY} hours per day can be booked per person. Please choose another date.`;
}
