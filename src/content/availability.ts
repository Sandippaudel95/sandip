/* ==========================================================================
   Defaults for the booking rules.

   These are no longer what the site runs on. The live values live in the
   AvailabilitySetting row and the BlackoutDate table, edited from
   /admin/availability, because closing a Friday afternoon should not need
   a code change and a deploy.

   What is here is the shape those settings take, the values the database
   was seeded with, and the fallback used if the row is ever missing.

   Times are Nepal time (Asia/Kathmandu), 24-hour "HH:mm".
   ========================================================================== */

/** Never changes, so it stays a constant rather than a setting. */
export const TIMEZONE = "Asia/Kathmandu";

/** 0 = Sunday, matching JavaScript's getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AvailabilityRules {
  /** Start times offered on each weekday. Absent or empty means closed. */
  openingHours: Partial<Record<Weekday, string[]>>;
  /** Session lengths a client may choose, in hours. */
  sessionLengths: number[];
  /** No booking may start within this many hours from now. */
  minimumNoticeHours: number;
  /** How far ahead the calendar opens. */
  bookingWindowDays: number;
  /** Total hours one client may hold on a single day. */
  maxHoursPerClientPerDay: number;
  /** Dates closed regardless of opening hours, "YYYY-MM-DD" in Nepal time. */
  blackoutDates: string[];
}

/**
 * The values the settings row was seeded with.
 *
 * Also the fallback if the row cannot be read: falling back to the old
 * behaviour keeps the calendar working, where falling back to "no hours"
 * would quietly close the site for business.
 */
export const DEFAULT_AVAILABILITY: AvailabilityRules = {
  openingHours: {
    0: ["10:00", "11:00", "14:00", "15:00", "16:00"], // Sunday
    1: ["10:00", "11:00", "14:00", "15:00", "16:00"],
    2: ["10:00", "11:00", "14:00", "15:00", "16:00"],
    3: ["10:00", "11:00", "14:00", "15:00", "16:00"],
    4: ["10:00", "11:00", "14:00", "15:00", "16:00"],
    5: ["10:00", "11:00"], // Friday, short day
    6: [], // Saturday closed
  },
  sessionLengths: [1, 2],
  minimumNoticeHours: 24,
  bookingWindowDays: 30,
  maxHoursPerClientPerDay: 2,
  blackoutDates: [],
};

/** Every start time the admin screen offers to switch on, in order. */
export const SELECTABLE_TIMES: string[] = Array.from(
  { length: 15 },
  (_, i) => `${String(i + 7).padStart(2, "0")}:00`,
);

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};
