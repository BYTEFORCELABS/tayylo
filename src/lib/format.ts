// Presentation helpers shared by every screen: money, dates and
// measurement values. Pure functions — no data access here.

import type { UnitSystem } from "@/types";

// ---------------------------------------------------------------- money

const moneyFormatters = new Map<string, (major: number) => string>();

function moneyFormatter(currency: string, compact = false) {
  const key = `${currency}:${compact}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    try {
      const nf = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: compact ? 1 : 0,
        minimumFractionDigits: 0,
        notation: compact ? "compact" : "standard",
      });
      f = (major: number) => nf.format(major);
    } catch {
      // Unknown currency code — fall back to a plain number with the code,
      // so the amount never loses its currency (e.g. "NAIRA 1,500").
      const plain = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: compact ? 1 : 0,
        notation: compact ? "compact" : "standard",
      });
      f = (major: number) => `${currency} ${plain.format(major)}`;
    }
    moneyFormatters.set(key, f);
  }
  return f;
}

/** Formats an amount stored in minor units (e.g. kobo, cents). */
export function formatMoney(minor: number, currency = "NGN", opts?: { compact?: boolean }) {
  return moneyFormatter(currency, opts?.compact)(minor / 100);
}

/** Just the symbol for a currency code, e.g. "₦" for NGN. */
export function currencySymbol(currency = "NGN") {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);
    return parts.find(p => p.type === "currency")?.value ?? currency;
  } catch {
    return currency;
  }
}

export const CURRENCIES = [
  { code: "NGN", name: "Nigerian Naira" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "British Pound" },
  { code: "EUR", name: "Euro" },
  { code: "INR", name: "Indian Rupee" },
] as const;

// ---------------------------------------------------------------- dates

export function formatDate(d: string | Date, opts: { year?: boolean } = {}) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(opts.year === false ? {} : { year: "numeric" }),
  });
}

export function formatDateShort(d: string | Date) {
  return formatDate(d, { year: false });
}

export function formatWeekday(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/** Whole days from now until `d` (negative when in the past). */
export function daysUntil(d: string | Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
}

export function dueLabel(d: string | Date) {
  const days = daysUntil(d);
  if (days < 0) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 6) return `Due in ${days} days`;
  return `Due ${formatDateShort(d)}`;
}

export function timeAgo(d: string | Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "yesterday" : `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} wk ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ---------------------------------------------------------- measurements

export function unitLabel(unit: UnitSystem) {
  return unit === "metric" ? "cm" : "in";
}

/** Stored millimetres → what a tailor reads off the tape. */
export function formatMeasurement(mm: number, unit: UnitSystem): string {
  if (unit === "metric") return (mm / 10).toFixed(1);
  const inches = mm / 25.4;
  let whole = Math.floor(inches);
  const frac = inches - whole;
  let f = "";
  if (frac >= 0.875) whole += 1;
  else if (frac >= 0.625) f = "¾";
  else if (frac >= 0.375) f = "½";
  else if (frac >= 0.125) f = "¼";
  return `${whole}${f}`;
}

/** Tape input (imperial fractions or metric decimals) → millimetres. */
export function parseMeasurement(raw: string, unit: UnitSystem): number {
  const clean = raw.trim();
  if (unit === "metric") return Math.round((parseFloat(clean) || 0) * 10);
  let val = 0;
  // Typed or imported ASCII fractions: "32 1/2", "32-1/2", "1/2".
  const ascii = clean.match(/^(\d+(?:\.\d+)?)?[\s-]*(\d+)\/(\d+)$/);
  if (clean.includes("¼")) val = (parseFloat(clean.replace("¼", "")) || 0) + 0.25;
  else if (clean.includes("½")) val = (parseFloat(clean.replace("½", "")) || 0) + 0.5;
  else if (clean.includes("¾")) val = (parseFloat(clean.replace("¾", "")) || 0) + 0.75;
  else if (ascii && Number(ascii[3]) > 0) val = (parseFloat(ascii[1] ?? "0") || 0) + Number(ascii[2]) / Number(ascii[3]);
  else val = parseFloat(clean) || 0;
  return Math.round(val * 25.4);
}

/**
 * Signed difference between two stored values, rounded to the unit's
 * working precision (¼ in or 0.5 cm). Returns 0 when below that precision.
 */
export function measurementDelta(currentMm: number, previousMm: number, unit: UnitSystem): number {
  const diffMm = currentMm - previousMm;
  if (unit === "metric") {
    const cm = Math.round((diffMm / 10) * 2) / 2;
    return Math.abs(cm) < 0.5 ? 0 : cm;
  }
  const inches = Math.round((diffMm / 25.4) * 4) / 4;
  return Math.abs(inches) < 0.25 ? 0 : inches;
}

export function formatDelta(delta: number, unit: UnitSystem) {
  if (delta === 0) return "No change";
  const sign = delta > 0 ? "+" : "−";
  const abs = Math.abs(delta);
  if (unit === "metric") return `${sign}${abs.toFixed(1)} cm`;
  // Imperial deltas are quarter-inch steps — show them as tailor fractions.
  const whole = Math.floor(abs);
  const frac = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[Math.round((abs - whole) * 4) / 4] ?? "";
  return `${sign}${whole > 0 ? whole : ""}${frac || (whole === 0 ? "0" : "")} in`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
