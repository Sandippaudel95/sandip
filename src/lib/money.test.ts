import { describe, expect, it } from "vitest";
import {
  advanceLeftNpr,
  billedNpr,
  deliveredNpr,
  engagementOutstandingNpr,
  receivedNpr,
  revenue,
  splitByHours,
  stillOwedNpr,
} from "./money";

/* The arithmetic every money figure on the site comes from. These were
   checked by hand against the live database while building; the point of
   writing them down is that they stay checked. */

const session = (amountNpr: number, bookingStatus: string) =>
  ({ amountNpr, bookingStatus }) as never;
const payment = (amountNpr: number) =>
  ({ amountNpr, receivedAt: new Date("2027-01-01") }) as never;
const engagement = (o: Partial<Record<string, unknown>>) =>
  ({ status: "AGREED", feeNpr: 0, amountPaidNpr: 0, ...o }) as never;

describe("splitByHours", () => {
  it("divides a total in proportion to hours", () => {
    expect(splitByHours(10_000, [1, 1])).toEqual([5000, 5000]);
    expect(splitByHours(75_000, Array(30).fill(1))).toEqual(Array(30).fill(2500));
  });

  it("always sums to exactly the total, however it rounds", () => {
    // 100 over three equal parts cannot divide evenly. Rounding each
    // share alone would lose a rupee, and revenue is summed from these.
    const parts = splitByHours(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it("puts the remainder on the first part", () => {
    expect(splitByHours(10, [1, 1, 1, 1, 1, 1, 1])).toEqual([4, 1, 1, 1, 1, 1, 1]);
  });

  it("survives a zero total and zero hours", () => {
    expect(splitByHours(0, [1, 2])).toEqual([0, 0]);
    expect(splitByHours(500, [])).toEqual([]);
    expect(splitByHours(500, [0, 0])).toEqual([0, 0]);
  });
});

describe("the four client figures", () => {
  // The real case: 30 hours agreed at a discounted 2,500, 45,000 paid up
  // front, two sessions delivered.
  const sessions = [
    session(2500, "COMPLETED"),
    session(2500, "COMPLETED"),
    ...Array(28).fill(session(2500, "CONFIRMED")),
  ];
  const payments = [payment(45_000)];

  it("bills every session that still stands", () => {
    expect(billedNpr(sessions)).toBe(75_000);
  });

  it("counts only what has arrived as received", () => {
    expect(receivedNpr(payments)).toBe(45_000);
  });

  it("counts only delivered sessions as billed so far", () => {
    expect(deliveredNpr(sessions)).toBe(5000);
  });

  it("reduces the advance by what has been delivered", () => {
    expect(advanceLeftNpr(payments, sessions)).toBe(40_000);
  });

  it("owes the difference between agreed and received", () => {
    expect(stillOwedNpr(sessions, payments)).toBe(30_000);
  });

  it("excludes a cancelled session from what is billed", () => {
    const withCancelled = [...sessions, session(2500, "CANCELLED")];
    expect(billedNpr(withCancelled)).toBe(75_000);
  });

  it("goes negative once delivery outruns the advance", () => {
    const allDone = Array(19).fill(session(2500, "COMPLETED"));
    // 19 x 2,500 = 47,500 delivered against 45,000 paid.
    expect(advanceLeftNpr(payments, allDone)).toBe(-2500);
  });

  it("never reports a negative debt when overpaid", () => {
    expect(stillOwedNpr([session(1000, "CONFIRMED")], [payment(5000)])).toBe(0);
  });
});

describe("revenue", () => {
  it("is money received, not bookings marked verified", () => {
    const split = revenue([payment(45_000)], [engagement({ amountPaidNpr: 5000 })]);
    expect(split.consultationsNpr).toBe(45_000);
    expect(split.otherWorkNpr).toBe(5000);
    expect(split.totalNpr).toBe(50_000);
  });

  it("ignores a cancelled engagement", () => {
    const split = revenue([], [engagement({ status: "CANCELLED", amountPaidNpr: 9000 })]);
    expect(split.totalNpr).toBe(0);
  });
});

describe("engagementOutstandingNpr", () => {
  it("is the unpaid part of the fee", () => {
    expect(engagementOutstandingNpr(engagement({ feeNpr: 40_000, amountPaidNpr: 20_000 }))).toBe(20_000);
  });

  it("is nothing once cancelled", () => {
    expect(
      engagementOutstandingNpr(
        engagement({ status: "CANCELLED", feeNpr: 40_000, amountPaidNpr: 0 }),
      ),
    ).toBe(0);
  });

  it("is nothing when an enquiry has been paid but not yet quoted", () => {
    // feeNpr stays 0 until a quote is given, so a payment on submission
    // must not read as an overpayment or a negative balance.
    expect(engagementOutstandingNpr(engagement({ feeNpr: 0, amountPaidNpr: 12_000 }))).toBe(0);
  });
});
