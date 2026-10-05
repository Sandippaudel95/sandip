import type { Booking, Engagement } from "@prisma/client";

/* ==========================================================================
   Revenue arithmetic.

   Bookings and engagements are two disjoint streams and are never merged
   into one record, so no amount can be counted twice. Every figure the
   dashboard shows is produced here, so that a new report cannot quietly
   forget one of the two sources.

   Pure functions only: no database access, so the rules can be reasoned
   about and exercised without one.
   ========================================================================== */

export interface RevenueSplit {
  /** Hourly consultations booked through the site, once payment is verified. */
  consultationsNpr: number;
  /** Negotiated work: reviews, analysis, commissioned studies, training. */
  otherWorkNpr: number;
  /** The two above. Nothing else contributes. */
  totalNpr: number;
}

/** A booking counts only once its payment has actually been verified. */
export function bookingIsEarned(b: Pick<Booking, "paymentStatus" | "bookingStatus">): boolean {
  return b.paymentStatus === "VERIFIED" && b.bookingStatus !== "CANCELLED";
}

/** Engagements count what has arrived, not what was quoted. */
export function engagementEarnedNpr(
  e: Pick<Engagement, "status" | "amountPaidNpr">,
): number {
  return e.status === "CANCELLED" ? 0 : Math.max(0, e.amountPaidNpr);
}

/** Quoted but not yet received, across work that is still live. */
export function engagementOutstandingNpr(
  e: Pick<Engagement, "status" | "feeNpr" | "amountPaidNpr">,
): number {
  if (e.status === "CANCELLED") return 0;
  return Math.max(0, e.feeNpr - e.amountPaidNpr);
}

export function revenue(
  bookings: Pick<Booking, "paymentStatus" | "bookingStatus" | "amountNpr">[],
  engagements: Pick<Engagement, "status" | "amountPaidNpr">[],
): RevenueSplit {
  const consultationsNpr = bookings.reduce(
    (sum, b) => (bookingIsEarned(b) ? sum + b.amountNpr : sum),
    0,
  );
  const otherWorkNpr = engagements.reduce(
    (sum, e) => sum + engagementEarnedNpr(e),
    0,
  );
  return {
    consultationsNpr,
    otherWorkNpr,
    totalNpr: consultationsNpr + otherWorkNpr,
  };
}

export function outstanding(
  engagements: Pick<Engagement, "status" | "feeNpr" | "amountPaidNpr">[],
): number {
  return engagements.reduce((sum, e) => sum + engagementOutstandingNpr(e), 0);
}

/**
 * The date a booking's revenue belongs to: when the session runs.
 *
 * Not when payment cleared. For a consultant the useful question is what a
 * given month's work was worth, and a session paid in advance belongs to
 * the month it is delivered in.
 */
export function bookingRevenueDate(b: Pick<Booking, "startsAt">): Date {
  return b.startsAt;
}

/**
 * The date an engagement's revenue belongs to.
 *
 * There is no payment date on the record, so this is an approximation:
 * when the work was completed, falling back to when it was created. Add a
 * paidAt field if period figures ever need to be exact.
 */
export function engagementRevenueDate(
  e: Pick<Engagement, "completedAt" | "createdAt">,
): Date {
  return e.completedAt ?? e.createdAt;
}

/**
 * Divide a total into parts proportional to hours, summing to the total.
 *
 * Rounding each share independently would lose or gain a rupee or two,
 * and the parts have to add back to what was actually charged, because
 * revenue is summed from the rows rather than stored once. The remainder
 * lands on the first session.
 *
 * Used by both booking paths: a client paying for several days online,
 * and the admin entering one agreed total for a long engagement.
 */
export function splitByHours(total: number, hours: number[]): number[] {
  const all = hours.reduce((a, b) => a + b, 0);
  if (all <= 0) return hours.map(() => 0);
  const parts = hours.map((h) => Math.floor((total * h) / all));
  parts[0] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}
