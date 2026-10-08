import type { Booking, Engagement, Payment } from "@prisma/client";

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

/**
 * Whether a booking is live: verified and not cancelled.
 *
 * No longer a statement about money. paymentStatus is a workflow flag,
 * and what was actually received lives in the Payment ledger, because a
 * part payment cannot be expressed by an enum.
 */
export function bookingIsEarned(
  b: Pick<Booking, "paymentStatus" | "bookingStatus">,
): boolean {
  return b.paymentStatus === "VERIFIED" && b.bookingStatus !== "CANCELLED";
}

type SessionAmount = Pick<Booking, "amountNpr" | "bookingStatus">;

/* receivedAt is required even where the arithmetic does not need it.
   Booking also has amountNpr, so a narrower type would let a list of
   bookings be passed as payments and silently count unpaid work as
   revenue. Booking has no receivedAt, so this makes that a type error. */
type PaymentLike = Pick<Payment, "amountNpr" | "receivedAt">;

/** What the client has been charged: every session still standing. */
export function billedNpr(sessions: SessionAmount[]): number {
  return sessions.reduce(
    (sum, s) => (s.bookingStatus === "CANCELLED" ? sum : sum + s.amountNpr),
    0,
  );
}

/** What has actually arrived. */
export function receivedNpr(payments: PaymentLike[]): number {
  return payments.reduce((sum, p) => sum + p.amountNpr, 0);
}

/** The value of the sessions already delivered. */
export function deliveredNpr(sessions: SessionAmount[]): number {
  return sessions.reduce(
    (sum, s) => (s.bookingStatus === "COMPLETED" ? sum + s.amountNpr : sum),
    0,
  );
}

/**
 * How much of what was paid up front is still unspent.
 *
 * Goes negative on purpose, and that is the signal worth having: it means
 * sessions have been delivered that the client has not covered. Callers
 * show that as owing for work already done rather than as a minus sign.
 */
export function advanceLeftNpr(
  payments: PaymentLike[],
  sessions: SessionAmount[],
): number {
  return receivedNpr(payments) - deliveredNpr(sessions);
}

/** Billed but not yet received. Never negative; an overpayment is not a debt. */
export function stillOwedNpr(
  sessions: SessionAmount[],
  payments: PaymentLike[],
): number {
  return Math.max(0, billedNpr(sessions) - receivedNpr(payments));
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

/**
 * Money received, split by where it came from.
 *
 * Sessions are summed from the payment ledger rather than from verified
 * bookings: once part payment exists, "this order is verified" and "this
 * much arrived" are different facts, and only the second is revenue.
 */
export function revenue(
  payments: PaymentLike[],
  engagements: Pick<Engagement, "status" | "amountPaidNpr">[],
): RevenueSplit {
  const consultationsNpr = receivedNpr(payments);
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

/** Quoted but unpaid across live engagements, plus unpaid session time. */
export function outstanding(
  engagements: Pick<Engagement, "status" | "feeNpr" | "amountPaidNpr">[],
  sessions: SessionAmount[] = [],
  payments: PaymentLike[] = [],
): number {
  return (
    engagements.reduce((sum, e) => sum + engagementOutstandingNpr(e), 0) +
    stillOwedNpr(sessions, payments)
  );
}

/**
 * The date a payment belongs to: when the money arrived.
 *
 * Exact, where the old rule had to approximate from the session date and
 * said so. A payment entered a week late still lands in the month it was
 * received.
 */
export function paymentRevenueDate(p: Pick<Payment, "receivedAt">): Date {
  return p.receivedAt;
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
