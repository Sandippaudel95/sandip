import { describe, expect, it } from "vitest";
import { runDates } from "./run";

describe("runDates", () => {
  it("steps a day at a time", () => {
    expect(runDates("2027-03-01", "daily", 3)).toEqual([
      "2027-03-01",
      "2027-03-02",
      "2027-03-03",
    ]);
  });

  it("steps a week at a time", () => {
    expect(runDates("2027-03-01", "weekly", 3)).toEqual([
      "2027-03-01",
      "2027-03-08",
      "2027-03-15",
    ]);
  });

  it("skips Saturday on weekdays, the one day the hours close", () => {
    // 2027-03-05 is a Friday, 06 a Saturday.
    const out = runDates("2027-03-05", "weekdays", 3);
    expect(out).toEqual(["2027-03-05", "2027-03-07", "2027-03-08"]);
  });

  it("returns the number of sessions asked for, not days stepped over", () => {
    // The distinction that matters: 15 weekday sessions is 15 sessions.
    expect(runDates("2027-03-01", "weekdays", 15)).toHaveLength(15);
  });

  it("crosses a month boundary", () => {
    expect(runDates("2027-03-30", "daily", 3)).toEqual([
      "2027-03-30",
      "2027-03-31",
      "2027-04-01",
    ]);
  });

  it("handles a leap day", () => {
    expect(runDates("2028-02-28", "daily", 3)).toEqual([
      "2028-02-28",
      "2028-02-29",
      "2028-03-01",
    ]);
  });

  it("returns nothing for a count of zero", () => {
    expect(runDates("2027-03-01", "daily", 0)).toEqual([]);
  });
});
