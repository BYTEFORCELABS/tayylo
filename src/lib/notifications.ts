// Notifications are derived from real order data — nothing is stored
// server-side yet. Read state is a per-device convenience in localStorage.

import type { Order } from "@/types";
import { balanceMinor, garmentOf, isActive, normalizeStatus } from "./orders";
import { daysUntil, dueLabel, formatMoney } from "./format";

export type NotificationKind = "overdue" | "due-soon" | "ready" | "balance";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  href: string;
  /** Lower sorts first. */
  priority: number;
}

export function deriveNotifications(orders: Order[]): AppNotification[] {
  const items: AppNotification[] = [];

  for (const o of orders) {
    if (!isActive(o)) continue;
    const days = daysUntil(o.dueAt);
    const garment = garmentOf(o);
    const bal = balanceMinor(o);

    if (days < 0) {
      items.push({
        id: `overdue:${o.id}:${o.dueAt}`,
        kind: "overdue",
        title: `${garment} for ${o.customerName} is overdue`,
        detail: `Order #${o.number} · ${dueLabel(o.dueAt)}`,
        href: `/orders/${o.id}`,
        priority: 0,
      });
    } else if (normalizeStatus(o.statusName) === "ready") {
      items.push({
        id: `ready:${o.id}`,
        kind: "ready",
        title: `${garment} is ready for ${o.customerName}`,
        detail:
          bal > 0
            ? `Order #${o.number} · ${formatMoney(bal, o.currency)} to collect on pickup`
            : `Order #${o.number} · Paid in full`,
        href: `/orders/${o.id}`,
        priority: 1,
      });
    } else if (days <= 3) {
      items.push({
        id: `due:${o.id}:${o.dueAt}`,
        kind: "due-soon",
        title: `${garment} for ${o.customerName}`,
        detail: `Order #${o.number} · ${dueLabel(o.dueAt)}`,
        href: `/orders/${o.id}`,
        priority: 2 + days,
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

const SEEN_KEY = "tayylo-notifications-seen";

export function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markSeen(ids: string[]) {
  try {
    const seen = readSeen();
    ids.forEach(id => seen.add(id));
    // Cap the list so it can't grow forever.
    localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-300)));
  } catch {
    // storage unavailable — unread dots just won't persist
  }
}
