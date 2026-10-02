/* ==========================================================================
   When sessions can be booked.

   Edit this file to change opening hours; free slots are these hours minus
   anything already booked. Days not listed are closed.

   Times are Nepal time (Asia/Kathmandu), 24-hour "HH:mm".
   ========================================================================== */

export const TIMEZONE = "Asia/Kathmandu";

/** 0 = Sunday, matching JavaScript's getDay(). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Start times offered on each weekday. Omit a day to close it. */
export const openingHours: Partial<Record<Weekday, string[]>> = {
  0: ["10:00", "11:00", "14:00", "15:00", "16:00"], // Sunday
  1: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  2: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  3: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  4: ["10:00", "11:00", "14:00", "15:00", "16:00"],
  5: ["10:00", "11:00"], // Friday, short day
  // 6 Saturday closed
};

/** Session lengths a client may choose, in hours. */
export const sessionLengths = [1, 2] as const;
export type SessionLength = (typeof sessionLengths)[number];

/** No booking may start within this many hours from now. */
export const MINIMUM_NOTICE_HOURS = 24;

/** How far ahead the calendar opens: one month. */
export const BOOKING_WINDOW_DAYS = 30;

/** Total hours one client may hold on a single day. */
export const MAX_HOURS_PER_CLIENT_PER_DAY = 2;

/** Dates closed regardless of opening hours, as "YYYY-MM-DD" in Nepal time. */
export const blackoutDates: string[] = [];
