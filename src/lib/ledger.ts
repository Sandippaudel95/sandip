import type { Booking, Engagement, Payment } from "@prisma/client";

/* ==========================================================================
   Statement of account for one client.

   Charges land when work is delivered, not when it is booked, so the
   running balance answers the question a client actually asks: what have
   I paid, what have I used, where does that leave us. A negative balance
   means they are in credit.

   Pure functions only, no database access, matching money.ts: the rules
   can then be exercised directly rather than through a page.
   ========================================================================== */

export type LedgerKind =
  | "session"
  | "engagement-fee"
  | "payment"
  | "engagement-payment";

export interface LedgerLine {
  at: Date;
  kind: LedgerKind;
  description: string;
  /** Owed by the client. Zero on a credit line. */
  chargeNpr: number;
  /** Paid by the client. Zero on a charge line. */
  creditNpr: number;
  /** Running total: positive means owing, negative means in credit. */
  balanceNpr: number;
  /** The date is a fallback, not a recorded fact. */
  approximateDate?: boolean;
}

export interface Ledger {
  lines: LedgerLine[];
  /** Final balance. Positive is owed to you, negative is client credit. */
  closingNpr: number;
  totalChargedNpr: number;
  totalPaidNpr: number;
}

const TYPE_LABEL: Record<Engagement["type"], string> = {
  THESIS_REVIEW: "Thesis review",
  PAPER_REVIEW: "Paper review",
  DATA_ANALYSIS: "Data analysis",
  RESEARCH_CONSULTANCY: "Research consultancy",
  TRAINING: "Training",
  OTHER: "Other work",
};

const hours = (n: number) => `${n} hour${n === 1 ? "" : "s"}`;

export function buildLedger(
  bookings: Pick<
    Booking,
    "id" | "startsAt" | "durationHours" | "amountNpr" | "bookingStatus"
  >[],
  payments: Pick<Payment, "id" | "receivedAt" | "amountNpr" | "method">[],
  engagements: Pick<
    Engagement,
    | "id"
    | "type"
    | "title"
    | "status"
    | "feeNpr"
    | "amountPaidNpr"
    | "completedAt"
    | "paidAt"
    | "createdAt"
    | "updatedAt"
  >[],
): Ledger {
  const draft: Omit<LedgerLine, "balanceNpr">[] = [];

  // A session is charged once it has happened. Booked-but-not-yet-run
  // time is not a debt, which is why an undelivered session is absent
  // rather than shown at zero.
  for (const b of bookings) {
    if (b.bookingStatus !== "COMPLETED") continue;
    draft.push({
      at: b.startsAt,
      kind: "session",
      description: `Consultation, ${hours(b.durationHours)}`,
      chargeNpr: b.amountNpr,
      creditNpr: 0,
    });
  }

  // Engagements have no part-delivery, so the fee lands whole, once.
  for (const e of engagements) {
    if (e.status === "DELIVERED" && e.feeNpr > 0) {
      draft.push({
        at: e.completedAt ?? e.createdAt,
        kind: "engagement-fee",
        description: `${TYPE_LABEL[e.type]}: ${e.title}`,
        chargeNpr: e.feeNpr,
        creditNpr: 0,
        approximateDate: e.completedAt === null,
      });
    }
    if (e.status !== "CANCELLED" && e.amountPaidNpr > 0) {
      draft.push({
        at: e.paidAt ?? e.updatedAt,
        kind: "engagement-payment",
        description: `Payment received — ${e.title}`,
        chargeNpr: 0,
        creditNpr: e.amountPaidNpr,
        approximateDate: e.paidAt === null,
      });
    }
  }

  for (const p of payments) {
    draft.push({
      at: p.receivedAt,
      kind: "payment",
      description: p.method
        ? `Payment received (${p.method})`
        : "Payment received",
      chargeNpr: 0,
      creditNpr: p.amountNpr,
    });
  }

  // Oldest first by instant, since a running balance only reads
  // downwards. The tiebreak matters only for identical timestamps, which
  // happens when two plain DATE rows fall on one day: a charge is placed
  // before a credit so the day does not end looking unpaid. Rows with
  // real times keep their true order.
  draft.sort(
    (a, b) =>
      a.at.getTime() - b.at.getTime() ||
      (b.chargeNpr > 0 ? 1 : 0) - (a.chargeNpr > 0 ? 1 : 0),
  );

  let balance = 0;
  const lines: LedgerLine[] = draft.map((l) => {
    balance += l.chargeNpr - l.creditNpr;
    return { ...l, balanceNpr: balance };
  });

  return {
    lines,
    closingNpr: balance,
    totalChargedNpr: lines.reduce((s, l) => s + l.chargeNpr, 0),
    totalPaidNpr: lines.reduce((s, l) => s + l.creditNpr, 0),
  };
}
