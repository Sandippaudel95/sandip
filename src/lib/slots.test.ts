import { describe, expect, it } from "vitest";
import { configuredTimes, dailyCapMessage, earliestStart, lastBookableDate } from "./slots";
import type { AvailabilityRules } from "@/content/availability";

/* The booking rules a crafted request has to be stopped by. These run
   against the rules object rather than the database, which is why slots
   takes them as an argument. */

const rules: AvailabilityRules = {
  openingHours: {
    0: ["10:00", "11:00", "14:00"],
    5: ["10:00", "11:00"],
    6: [],
  },
  sessionLengths: [1, 2],
  minimumNoticeHours: 24,
  bookingWindowDays: 30,
  maxHoursPerClientPerDay: 2,
  blackoutDates: ["2027-03-07"],
};

describe("configuredTimes", () => {
  it("offers the hours set for that weekday", () => {
    // 2027-03-07 is a Sunday, but it is blacked out.
    expect(configuredTimes("2027-03-14", rules)).toEqual(["10:00", "11:00", "14:00"]);
  });

  it("offers nothing on a day with no hours", () => {
    // 2027-03-13 is a Saturday, configured empty.
    expect(configuredTimes("2027-03-13", rules)).toEqual([]);
  });

  it("offers nothing on a blacked-out date, whatever its weekday", () => {
    expect(configuredTimes("2027-03-07", rules)).toEqual([]);
  });

  it("offers nothing on a weekday that is absent entirely", () => {
    // Monday is not in openingHours at all.
    expect(configuredTimes("2027-03-08", rules)).toEqual([]);
  });
});

describe("earliestStart", () => {
  it("is the notice period from now", () => {
    const gap = earliestStart(rules).getTime() - Date.now();
    expect(Math.round(gap / 3_600_000)).toBe(24);
  });

  it("is now when no notice is required", () => {
    const gap = earliestStart({ ...rules, minimumNoticeHours: 0 }).getTime() - Date.now();
    expect(Math.abs(gap)).toBeLessThan(1000);
  });
});

describe("lastBookableDate", () => {
  it("is the window length ahead", () => {
    expect(lastBookableDate(rules)).toBe(lastBookableDate(rules));
    expect(lastBookableDate({ ...rules, bookingWindowDays: 0 })).not.toBe(
      lastBookableDate(rules),
    );
  });
});

describe("dailyCapMessage", () => {
  it("names both the hours held and the cap", () => {
    expect(dailyCapMessage(2, 2)).toContain("2 hours booked");
    expect(dailyCapMessage(2, 2)).toContain("maximum of 2 hours");
  });

  it("says hour, not hours, for one", () => {
    expect(dailyCapMessage(1, 2)).toContain("1 hour booked");
  });
});
