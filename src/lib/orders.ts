// Order-domain derivations shared across Today, Orders, Client and
// Order screens, so "outstanding", "active" and "overdue" mean the same
// thing everywhere.

import type { Order, OrderStatusName } from "@/types";
import { daysUntil } from "./format";

export const ORDER_STATUSES: { key: OrderStatusName; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "cutting", label: "Cutting" },
  { key: "sewing", label: "Sewing" },
  { key: "fitting", label: "Fitting" },
  { key: "alterations", label: "Alterations" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/** The linear production path shown as a progress track. */
/**
 * The agreed price can be changed this many times after it's first set, so
 * a client's bill can't keep moving. Setting a price on an order that had
 * none doesn't count.
 */
export const MAX_PRICE_CHANGES = 2;

export const PRODUCTION_PATH: OrderStatusName[] = [
  "pending",
  "cutting",
  "sewing",
  "fitting",
  "ready",
  "delivered",
];

export const PAYMENT_METHODS = ["Transfer", "Cash", "Card / POS", "Mobile money"] as const;

/**
 * Maps a stored status onto a known one, tolerating case, spacing and
 * hyphen/underscore differences ("Ready", " sewing ", "in-fitting"…).
 * Returns null for statuses the app doesn't know.
 */
export function normalizeStatus(raw: string | null | undefined): OrderStatusName | null {
  const key = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return ORDER_STATUSES.find(s => s.key === key)?.key ?? null;
}

/** Human label for any status, including ones the app doesn't recognise. */
export function statusLabel(status: string) {
  if (status === "overdue") return "Overdue";
  const known = normalizeStatus(status);
  if (known) return ORDER_STATUSES.find(s => s.key === known)!.label;
  const text = String(status ?? "").trim().replace(/[_-]+/g, " ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Unknown";
}

export function isActive(o: Order) {
  const s = normalizeStatus(o.statusName);
  return s !== "delivered" && s !== "cancelled";
}

export function paidMinor(o: Order) {
  return o.payments.reduce((s, p) => s + p.amountMinor, 0);
}

export function balanceMinor(o: Order) {
  return Math.max(0, o.priceMinor - paidMinor(o));
}

export function isOverdue(o: Order) {
  return isActive(o) && daysUntil(o.dueAt) < 0;
}

/** Status to display — overdue overrides the stored status for active orders. */
export function displayStatus(o: Order): string {
  return isOverdue(o) ? "overdue" : (normalizeStatus(o.statusName) ?? o.statusName);
}

export function garmentOf(o: Order) {
  return o.items[0]?.garmentType || "Garment";
}

export function collectedInMonth(orders: Order[], ref = new Date()) {
  return orders.reduce(
    (sum, o) =>
      sum +
      o.payments
        .filter(p => {
          const d = new Date(p.paidAt);
          return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
        })
        .reduce((s, p) => s + p.amountMinor, 0),
    0
  );
}
