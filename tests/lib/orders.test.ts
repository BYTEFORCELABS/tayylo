import { describe, expect, it } from "vitest";
import type { Order } from "@/types";
import {
  MAX_PRICE_CHANGES,
  ORDER_STATUSES,
  PRODUCTION_PATH,
  balanceMinor,
  collectedInMonth,
  displayStatus,
  garmentOf,
  isActive,
  isOverdue,
  normalizeStatus,
  paidMinor,
  statusLabel,
} from "@/lib/orders";

function daysFromToday(n: number) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

// Loose overrides: tests deliberately pass legacy/mixed-case status names and
// partial payments to check how the helpers cope with real-world data.
type OrderOverrides = Omit<Partial<Order>, "payments" | "statusName"> & {
  statusName?: string;
  payments?: { amountMinor: number; paidAt?: string }[];
};

function order(o: OrderOverrides = {}): Order {
  return {
    id: "o1",
    customerId: "c1",
    customerName: "Ada",
    number: "ORD-1",
    statusName: "pending",
    dueAt: daysFromToday(7),
    priceMinor: 100_000,
    currency: "NGN",
    items: [{ garmentType: "Agbada" }],
    fittings: [],
    ...o,
    payments: (o.payments ?? []).map((p, i) => ({ id: `p${i}`, method: "Cash", ...p, paidAt: p.paidAt ?? new Date().toISOString() })),
  } as unknown as Order;
}

describe("constants", () => {
  it("production path is a subset of known statuses", () => {
    const keys = ORDER_STATUSES.map(s => s.key);
    for (const s of PRODUCTION_PATH) expect(keys).toContain(s);
    expect(MAX_PRICE_CHANGES).toBe(2);
  });
});

describe("normalizeStatus", () => {
  it("tolerates case, whitespace, hyphens and underscores", () => {
    expect(normalizeStatus("Ready")).toBe("ready");
    expect(normalizeStatus("  SEWING ")).toBe("sewing");
    expect(normalizeStatus("delivered")).toBe("delivered");
  });
  it("returns null for unknown, empty and nullish", () => {
    expect(normalizeStatus("in-fitting")).toBeNull();
    expect(normalizeStatus("")).toBeNull();
    expect(normalizeStatus(null)).toBeNull();
    expect(normalizeStatus(undefined)).toBeNull();
  });
});

describe("statusLabel", () => {
  it("labels known, overdue and unknown statuses", () => {
    expect(statusLabel("overdue")).toBe("Overdue");
    expect(statusLabel("alterations")).toBe("Alterations");
    expect(statusLabel(" Ready")).toBe("Ready");
    expect(statusLabel("custom_step")).toBe("Custom step");
    expect(statusLabel("hand-finish")).toBe("Hand finish");
    expect(statusLabel("")).toBe("Unknown");
  });
});

describe("money", () => {
  it("paidMinor sums payments", () => {
    expect(paidMinor(order())).toBe(0);
    expect(paidMinor(order({ payments: [{ amountMinor: 30_000 }, { amountMinor: 20_000 }] }))).toBe(50_000);
  });
  it("balanceMinor is price minus paid, never negative", () => {
    expect(balanceMinor(order())).toBe(100_000);
    expect(balanceMinor(order({ payments: [{ amountMinor: 40_000 }] }))).toBe(60_000);
    expect(balanceMinor(order({ payments: [{ amountMinor: 100_000 }] }))).toBe(0);
    expect(balanceMinor(order({ payments: [{ amountMinor: 150_000 }] }))).toBe(0);
    expect(balanceMinor(order({ priceMinor: 0 }))).toBe(0);
  });
});

describe("activity and overdue", () => {
  it("isActive excludes delivered and cancelled in any casing", () => {
    expect(isActive(order({ statusName: "sewing" }))).toBe(true);
    expect(isActive(order({ statusName: "Delivered" }))).toBe(false);
    expect(isActive(order({ statusName: "cancelled" }))).toBe(false);
    expect(isActive(order({ statusName: "something-custom" }))).toBe(true);
  });

  it("isOverdue only for active orders due before today", () => {
    expect(isOverdue(order({ dueAt: daysFromToday(-1) }))).toBe(true);
    expect(isOverdue(order({ dueAt: daysFromToday(0) }))).toBe(false);
    expect(isOverdue(order({ dueAt: daysFromToday(3) }))).toBe(false);
    expect(isOverdue(order({ dueAt: daysFromToday(-5), statusName: "delivered" }))).toBe(false);
    expect(isOverdue(order({ dueAt: daysFromToday(-5), statusName: "cancelled" }))).toBe(false);
  });

  it("displayStatus: overdue overrides, otherwise normalized or raw", () => {
    expect(displayStatus(order({ dueAt: daysFromToday(-2), statusName: "sewing" }))).toBe("overdue");
    expect(displayStatus(order({ statusName: "Ready" }))).toBe("ready");
    expect(displayStatus(order({ statusName: "Hand finish" }))).toBe("Hand finish");
  });
});

describe("garmentOf", () => {
  it("first item's garment, or a fallback", () => {
    expect(garmentOf(order())).toBe("Agbada");
    expect(garmentOf(order({ items: [] as unknown as Order["items"] }))).toBe("Garment");
    expect(garmentOf(order({ items: [{ garmentType: "" }] as unknown as Order["items"] }))).toBe("Garment");
  });
});

describe("collectedInMonth", () => {
  it("sums payments in the reference month and year only", () => {
    const ref = new Date(2026, 5, 15); // June 2026
    const orders = [
      order({ payments: [{ amountMinor: 10_000, paidAt: new Date(2026, 5, 1).toISOString() }, { amountMinor: 5_000, paidAt: new Date(2026, 4, 31).toISOString() }] }),
      order({ payments: [{ amountMinor: 7_000, paidAt: new Date(2026, 5, 30, 20).toISOString() }, { amountMinor: 9_000, paidAt: new Date(2025, 5, 10).toISOString() }] }),
    ];
    expect(collectedInMonth(orders, ref)).toBe(17_000);
    expect(collectedInMonth([], ref)).toBe(0);
  });
});
