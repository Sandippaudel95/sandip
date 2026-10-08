import { describe, expect, it } from "vitest";
import { buildLedger } from "./ledger";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const session = (date: string, status: string, amountNpr = 2500) =>
  ({
    id: date,
    startsAt: new Date(`${date}T04:15:00.000Z`),
    durationHours: 1,
    amountNpr,
    bookingStatus: status,
  }) as never;

const payment = (date: string, amountNpr: number, method: string | null = null) =>
  ({ id: date, receivedAt: d(date), amountNpr, method }) as never;

const engagement = (o: Partial<Record<string, unknown>>) =>
  ({
    id: "e",
    type: "THESIS_REVIEW",
    title: "Masters thesis",
    status: "DELIVERED",
    feeNpr: 0,
    amountPaidNpr: 0,
    completedAt: null,
    paidAt: null,
    createdAt: d("2027-01-01"),
    updatedAt: d("2027-01-01"),
    ...o,
  }) as never;

describe("buildLedger", () => {
  it("has nothing to show for a client with nothing", () => {
    const l = buildLedger([], [], []);
    expect(l.lines).toEqual([]);
    expect(l.closingNpr).toBe(0);
  });

  it("charges a session only once it has been delivered", () => {
    const l = buildLedger(
      [session("2027-06-01", "COMPLETED"), session("2027-06-02", "CONFIRMED")],
      [],
      [],
    );
    expect(l.lines).toHaveLength(1);
    expect(l.totalChargedNpr).toBe(2500);
  });

  it("ignores a cancelled session entirely", () => {
    const l = buildLedger([session("2027-06-01", "CANCELLED")], [], []);
    expect(l.lines).toHaveLength(0);
  });

  it("runs the real case to a credit balance", () => {
    // 30 sessions agreed, 45,000 paid up front, two delivered.
    const sessions = Array.from({ length: 30 }, (_, i) =>
      session(
        `2027-06-${String(i + 1).padStart(2, "0")}`,
        i < 2 ? "COMPLETED" : "CONFIRMED",
      ),
    );
    const l = buildLedger(sessions, [payment("2027-06-01", 45_000, "bank")], []);

    expect(l.totalChargedNpr).toBe(5000);
    expect(l.totalPaidNpr).toBe(45_000);
    // Negative is the client in credit, and must equal the advance left.
    expect(l.closingNpr).toBe(-40_000);
  });

  it("accumulates the balance down the page, oldest first", () => {
    const l = buildLedger(
      [session("2027-06-02", "COMPLETED"), session("2027-06-03", "COMPLETED")],
      [payment("2027-06-01", 10_000)],
      [],
    );
    expect(l.lines.map((x) => x.balanceNpr)).toEqual([-10_000, -7500, -5000]);
  });

  it("settles a charge before a credit when the timestamps are identical", () => {
    // Two plain DATE rows on one day: without a tiebreak the day could
    // end looking unpaid.
    const sameInstant = {
      id: "x",
      startsAt: d("2027-07-01"),
      durationHours: 1,
      amountNpr: 2500,
      bookingStatus: "COMPLETED",
    } as never;
    const l = buildLedger([sameInstant], [payment("2027-07-01", 2500)], []);
    expect(l.lines.map((x) => x.kind)).toEqual(["session", "payment"]);
    expect(l.closingNpr).toBe(0);
  });

  it("charges an engagement fee only once delivered", () => {
    const quoted = buildLedger([], [], [engagement({ status: "QUOTED", feeNpr: 40_000 })]);
    expect(quoted.lines).toHaveLength(0);

    const done = buildLedger(
      [],
      [],
      [engagement({ feeNpr: 40_000, completedAt: d("2027-08-10") })],
    );
    expect(done.totalChargedNpr).toBe(40_000);
  });

  it("marks an engagement payment approximate when it has no date", () => {
    const l = buildLedger(
      [],
      [],
      [engagement({ amountPaidNpr: 20_000, updatedAt: d("2027-09-15") })],
    );
    expect(l.lines[0].approximateDate).toBe(true);
    expect(l.lines[0].at).toEqual(d("2027-09-15"));
  });

  it("does not mark it approximate once a paid date is recorded", () => {
    const l = buildLedger(
      [],
      [],
      [engagement({ amountPaidNpr: 20_000, paidAt: d("2027-09-01") })],
    );
    expect(l.lines[0].approximateDate).toBe(false);
    expect(l.lines[0].at).toEqual(d("2027-09-01"));
  });

  it("drops a cancelled engagement from both sides", () => {
    const l = buildLedger(
      [],
      [],
      [engagement({ status: "CANCELLED", feeNpr: 40_000, amountPaidNpr: 20_000 })],
    );
    expect(l.lines).toHaveLength(0);
  });
});
