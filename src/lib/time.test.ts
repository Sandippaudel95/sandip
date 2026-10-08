import { describe, expect, it } from "vitest";
import { addDays, addHours, nepalDateKey, nepalToUtc, weekdayOf } from "./time";

/* Nepal is UTC+05:45 with no daylight saving. The offset is the reason
   these exist: an off-by-45-minutes bug puts a session on the wrong day
   rather than merely the wrong hour. */

describe("nepalToUtc", () => {
  it("subtracts the 5:45 offset", () => {
    expect(nepalToUtc("2027-03-01", "10:00").toISOString()).toBe(
      "2027-03-01T04:15:00.000Z",
    );
  });

  it("rolls back a day for an early morning slot", () => {
    expect(nepalToUtc("2027-03-01", "05:00").toISOString()).toBe(
      "2027-02-28T23:15:00.000Z",
    );
  });

  it("does not shift with the seasons, since Nepal has no DST", () => {
    const summer = nepalToUtc("2027-07-01", "10:00").toISOString().slice(11);
    const winter = nepalToUtc("2027-01-01", "10:00").toISOString().slice(11);
    expect(summer).toBe(winter);
  });
});

describe("nepalDateKey", () => {
  it("gives the Nepal day, not the UTC day", () => {
    // 23:30 Nepal on 1 March is still 17:45 UTC on 1 March.
    expect(nepalDateKey(new Date("2027-03-01T17:45:00.000Z"))).toBe("2027-03-01");
  });

  it("counts late evening as the same Nepal day", () => {
    // 18:30 UTC is 00:15 Nepal the next day.
    expect(nepalDateKey(new Date("2027-03-01T18:30:00.000Z"))).toBe("2027-03-02");
  });
});

describe("addHours", () => {
  it("keeps the minutes", () => {
    expect(addHours("18:30", 2)).toBe("20:30");
  });

  it("adds whole hours", () => {
    expect(addHours("10:00", 1)).toBe("11:00");
  });
});

describe("addDays", () => {
  it("crosses a month", () => {
    expect(addDays("2027-03-31", 1)).toBe("2027-04-01");
  });

  it("crosses a year", () => {
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
  });
});

describe("weekdayOf", () => {
  it("returns 0 for Sunday, matching getDay", () => {
    expect(weekdayOf("2027-03-07")).toBe(0);
    expect(weekdayOf("2027-03-06")).toBe(6);
  });
});
