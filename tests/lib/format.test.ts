import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currencySymbol,
  daysUntil,
  dueLabel,
  formatDate,
  formatDateShort,
  formatDelta,
  formatMeasurement,
  formatMoney,
  formatWeekday,
  greeting,
  initials,
  measurementDelta,
  parseMeasurement,
  timeAgo,
  unitLabel,
} from "@/lib/format";

// Expected money strings assume the en-US default locale of the test runner.

function daysFromToday(n: number, hour = 12) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

describe("formatMoney", () => {
  it("formats minor units as whole currency amounts", () => {
    expect(formatMoney(150000, "NGN")).toBe("₦1,500");
    expect(formatMoney(0, "NGN")).toBe("₦0");
    expect(formatMoney(199900, "USD")).toBe("$1,999");
    expect(formatMoney(-50000, "NGN")).toBe("-₦500");
  });

  it("defaults to NGN", () => {
    expect(formatMoney(100)).toBe("₦1");
  });

  it("rounds half-kobo amounts to the nearest whole unit", () => {
    expect(formatMoney(150050, "NGN")).toBe("₦1,501");
    expect(formatMoney(150049, "NGN")).toBe("₦1,500");
  });

  it("supports compact notation", () => {
    expect(formatMoney(125_000_000, "NGN", { compact: true })).toBe("₦1.3M");
  });

  it("handles very large amounts without exponent notation", () => {
    expect(formatMoney(1_000_000_000_000, "NGN")).toBe("₦10,000,000,000");
  });

  it("keeps the currency visible for an unknown currency code", () => {
    // The fallback comment promises "a plain number with the code".
    const out = formatMoney(150000, "NAIRA");
    expect(out).toContain("1,500");
    expect(out).toContain("NAIRA");
  });
});

describe("currencySymbol", () => {
  it("returns narrow symbols", () => {
    expect(currencySymbol("NGN")).toBe("₦");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol()).toBe("₦");
  });
  it("falls back to the code when unknown", () => {
    expect(currencySymbol("NAIRA")).toBe("NAIRA");
  });
});

describe("dates", () => {
  const d = "2026-03-05T12:00:00Z";
  it("formatDate / formatDateShort / formatWeekday", () => {
    expect(formatDate(d)).toBe("5 Mar 2026");
    expect(formatDate(new Date(d), { year: false })).toBe("5 Mar");
    expect(formatDateShort(d)).toBe("5 Mar");
    expect(formatWeekday(d)).toBe("Thursday 5 March");
  });

  it("daysUntil counts calendar days, ignoring time of day", () => {
    expect(daysUntil(daysFromToday(0, 23))).toBe(0);
    expect(daysUntil(daysFromToday(0, 0))).toBe(0);
    expect(daysUntil(daysFromToday(1, 1))).toBe(1);
    expect(daysUntil(daysFromToday(-1, 23))).toBe(-1);
    expect(daysUntil(daysFromToday(30))).toBe(30);
  });

  it("dueLabel", () => {
    expect(dueLabel(daysFromToday(-1))).toBe("1 day overdue");
    expect(dueLabel(daysFromToday(-3))).toBe("3 days overdue");
    expect(dueLabel(daysFromToday(0))).toBe("Due today");
    expect(dueLabel(daysFromToday(1))).toBe("Due tomorrow");
    expect(dueLabel(daysFromToday(6))).toBe("Due in 6 days");
    const far = daysFromToday(7);
    expect(dueLabel(far)).toBe(`Due ${formatDateShort(far)}`);
  });

  it("timeAgo", () => {
    const ago = (ms: number) => new Date(Date.now() - ms);
    const MIN = 60_000, H = 60 * MIN, D = 24 * H;
    expect(timeAgo(ago(10_000))).toBe("just now");
    expect(timeAgo(ago(5 * MIN))).toBe("5 min ago");
    expect(timeAgo(ago(3 * H))).toBe("3 h ago");
    expect(timeAgo(ago(D))).toBe("yesterday");
    expect(timeAgo(ago(3 * D))).toBe("3 days ago");
    expect(timeAgo(ago(14 * D))).toBe("2 wk ago");
    expect(timeAgo(ago(60 * D))).toBe("2 mo ago");
    expect(timeAgo(ago(400 * D))).toBe("1 yr ago");
    expect(timeAgo(new Date(Date.now() + H))).toBe("just now");
  });

  describe("greeting", () => {
    afterEach(() => vi.useRealTimers());
    it("switches at 12:00 and 17:00", () => {
      const at = (h: number) => {
        const d = new Date();
        d.setHours(h, 0, 0, 0);
        return d;
      };
      expect(greeting(at(0))).toBe("Good morning");
      expect(greeting(at(11))).toBe("Good morning");
      expect(greeting(at(12))).toBe("Good afternoon");
      expect(greeting(at(16))).toBe("Good afternoon");
      expect(greeting(at(17))).toBe("Good evening");
      expect(greeting(at(23))).toBe("Good evening");
    });
  });
});

describe("measurements", () => {
  it("unitLabel", () => {
    expect(unitLabel("metric")).toBe("cm");
    expect(unitLabel("imperial")).toBe("in");
  });

  it("formatMeasurement metric shows one decimal cm", () => {
    expect(formatMeasurement(1005, "metric")).toBe("100.5");
    expect(formatMeasurement(0, "metric")).toBe("0.0");
    expect(formatMeasurement(1000, "metric")).toBe("100.0");
  });

  it("formatMeasurement imperial snaps to the nearest quarter inch", () => {
    expect(formatMeasurement(254, "imperial")).toBe("10");
    expect(formatMeasurement(1019, "imperial")).toBe("40"); // 40.12 in
    expect(formatMeasurement(1022, "imperial")).toBe("40¼"); // 40.24 in
    expect(formatMeasurement(1029, "imperial")).toBe("40½"); // 40.51 in
    expect(formatMeasurement(1035, "imperial")).toBe("40¾"); // 40.75 in
    expect(formatMeasurement(1039, "imperial")).toBe("41"); // 40.91 in
    expect(formatMeasurement(0, "imperial")).toBe("0");
  });

  it("parseMeasurement metric", () => {
    expect(parseMeasurement("100.5", "metric")).toBe(1005);
    expect(parseMeasurement(" 32 ", "metric")).toBe(320);
    expect(parseMeasurement("", "metric")).toBe(0);
    expect(parseMeasurement("abc", "metric")).toBe(0);
  });

  it("parseMeasurement imperial with tailor fraction glyphs", () => {
    expect(parseMeasurement("40", "imperial")).toBe(1016);
    expect(parseMeasurement("32¼", "imperial")).toBe(819);
    expect(parseMeasurement(" 32 ½ ", "imperial")).toBe(826);
    expect(parseMeasurement("40¾", "imperial")).toBe(1035);
    expect(parseMeasurement("¾", "imperial")).toBe(19);
    expect(parseMeasurement("", "imperial")).toBe(0);
  });

  it("parseMeasurement imperial with ASCII fractions (e.g. typed or imported '32 1/2')", () => {
    expect(parseMeasurement("32 1/2", "imperial")).toBe(826);
    expect(parseMeasurement("32 1/4", "imperial")).toBe(819);
  });

  it("parse → format round-trips at tape precision", () => {
    for (const s of ["30", "30¼", "30½", "30¾", "44½"]) {
      expect(formatMeasurement(parseMeasurement(s, "imperial"), "imperial")).toBe(s);
    }
    for (const s of ["30.0", "30.5", "101.5"]) {
      expect(formatMeasurement(parseMeasurement(s, "metric"), "metric")).toBe(s);
    }
  });

  it("measurementDelta metric rounds to 0.5 cm and ignores smaller changes", () => {
    expect(measurementDelta(1010, 1000, "metric")).toBe(1);
    expect(measurementDelta(1003, 1000, "metric")).toBe(0.5);
    expect(measurementDelta(1002, 1000, "metric")).toBe(0);
    expect(measurementDelta(995, 1000, "metric")).toBe(-0.5);
    expect(measurementDelta(1000, 1000, "metric")).toBe(0);
  });

  it("measurementDelta imperial rounds to ¼ in", () => {
    expect(measurementDelta(1029, 1016, "imperial")).toBe(0.5);
    expect(measurementDelta(1019, 1016, "imperial")).toBe(0);
    expect(measurementDelta(1010, 1016, "imperial")).toBe(-0.25);
    expect(measurementDelta(1016 + 254, 1016, "imperial")).toBe(10);
  });

  it("formatDelta", () => {
    expect(formatDelta(0, "metric")).toBe("No change");
    expect(formatDelta(0.5, "metric")).toBe("+0.5 cm");
    expect(formatDelta(-1.5, "metric")).toBe("−1.5 cm");
    expect(formatDelta(0.25, "imperial")).toBe("+¼ in");
    expect(formatDelta(-1.75, "imperial")).toBe("−1¾ in");
    expect(formatDelta(2, "imperial")).toBe("+2 in");
    expect(formatDelta(1.5, "imperial")).toBe("+1½ in");
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Ada Obi")).toBe("AO");
    expect(initials("ada ngozi obi")).toBe("AO");
    expect(initials("  ada  ")).toBe("A");
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
