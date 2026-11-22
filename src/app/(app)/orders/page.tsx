"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ClipboardList, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/choice";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { OrderRow } from "@/components/order-list-item";
import { useCustomers, useOrders } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { balanceMinor, isActive, isOverdue, normalizeStatus } from "@/lib/orders";
import { useBusiness } from "@/lib/use-business";
import type { Order, OrderStatusName } from "@/types";

type Filter = "active" | "overdue" | "owing" | OrderStatusName | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All orders" },
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "cutting", label: "Cutting" },
  { key: "overdue", label: "Overdue" },
  { key: "owing", label: "Balance due" },
  { key: "sewing", label: "Sewing" },
  { key: "fitting", label: "Fitting" },
  { key: "alterations", label: "Alterations" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/** Tabs that always show, even at zero (like the design's "Cutting 0"). */
const CORE_TABS: Filter[] = ["all", "active", "pending", "cutting"];

function dayKey(d: string) {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

/** "Today", "Yesterday" or "23rd Aug, 2026". */
function dayLabel(d: string) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today.toISOString())) return "Today";
  if (dayKey(d) === dayKey(yesterday.toISOString())) return "Yesterday";
  const n = date.getDate();
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return `${n}${suffix} ${date.toLocaleDateString("en-GB", { month: "short" })}, ${date.getFullYear()}`;
}

function matches(o: Order, f: Filter) {
  switch (f) {
    case "all":
      return true;
    case "active":
      return isActive(o);
    case "overdue":
      return isOverdue(o);
    case "owing":
      return normalizeStatus(o.statusName) !== "cancelled" && balanceMinor(o) > 0;
    default:
      return normalizeStatus(o.statusName) === f;
  }
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currency } = useBusiness();
  const ordersQ = useOrders();
  const customersQ = useCustomers();
  const clientPhotos = React.useMemo(
    () => Object.fromEntries((customersQ.data ?? []).map(c => [c.id, c.photoUrl])) as Record<string, string | undefined>,
    [customersQ.data]
  );
  const orders = React.useMemo(() => ordersQ.data ?? [], [ordersQ.data]);
  const status: "loading" | "ready" | "error" = ordersQ.data ? "ready" : ordersQ.status;
  const initialQ = searchParams.get("q") ?? "";
  // `?filter=owing` / `?filter=active` (from Home's summary card) opens on that tab.
  const filterParam = searchParams.get("filter");
  const [filter, setFilter] = React.useState<Filter>(
    FILTERS.some(f => f.key === filterParam) ? (filterParam as Filter) : "all"
  );
  const [search, setSearch] = React.useState(initialQ);
  const [searchOpen, setSearchOpen] = React.useState(!!initialQ);


  const q = search.trim().toLowerCase();
  const filtered = orders
    .filter(o => matches(o, filter))
    .filter(
      o =>
        !q ||
        o.customerName.toLowerCase().includes(q) ||
        o.number.toLowerCase().includes(q) ||
        o.items.some(i => i.garmentType.toLowerCase().includes(q) || i.styleNotes?.toLowerCase().includes(q))
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  // Grouped by the day each order was taken: Today, Yesterday, 23rd Aug…
  const groups: { label: string; orders: Order[] }[] = [];
  for (const o of filtered) {
    const label = dayLabel(o.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.orders.push(o);
    else groups.push({ label, orders: [o] });
  }

  const counts = React.useMemo(() => {
    const c: Partial<Record<Filter, number>> = {};
    FILTERS.forEach(f => (c[f.key] = orders.filter(o => matches(o, f.key)).length));
    return c;
  }, [orders]);

  const visibleFilters = FILTERS.filter(f => CORE_TABS.includes(f.key) || (counts[f.key] ?? 0) > 0 || f.key === filter);
  const filteredBalance = filtered.reduce((s, o) => s + (normalizeStatus(o.statusName) === "cancelled" ? 0 : balanceMinor(o)), 0);

  return (
    <>
      <PageHeader
        title="Orders"
        description={
          status === "ready" && orders.length > 0
            ? `${counts.active ?? 0} active${counts.overdue ? ` · ${counts.overdue} overdue` : ""}`
            : undefined
        }
        actions={
          <>
            {orders.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search orders"
                aria-pressed={searchOpen}
                onClick={() => setSearchOpen(o => !o)}
                className="lg:hidden"
              >
                <Search />
              </Button>
            )}
            <Button onClick={() => router.push("/orders/new")}>
              <Plus />
              New order
            </Button>
          </>
        }
      >
        {orders.length > 0 && (
          <div className="space-y-3 pb-3">
            <SearchField
              value={search}
              onValueChange={setSearch}
              placeholder="Search client, order or garment"
              className={cn(!searchOpen && "max-lg:hidden")}
              autoFocus={searchOpen && !initialQ}
            />
            <div
              role="tablist"
              aria-label="Filter orders"
              className="-mx-4 flex overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0"
            >
              <div className="flex gap-1 rounded-full bg-surface-sunken p-1">
                {visibleFilters.map(f => {
                  const selected = filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setFilter(f.key)}
                      className={cn(
                        "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13.5px] transition-[background-color,color,box-shadow] duration-[var(--duration-fast)]",
                        selected ? "bg-surface-raised font-semibold text-ink shadow-[var(--shadow-xs)]" : "font-medium text-text-secondary hover:text-ink"
                      )}
                    >
                      {f.label}
                      <span
                        className={cn(
                          "tabular min-w-5 rounded-[6px] px-1 text-center text-[11px] leading-5",
                          selected ? "bg-surface-sunken text-ink" : "bg-surface-raised/70 text-text-tertiary"
                        )}
                      >
                        {counts[f.key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </PageHeader>

      <PageBody>
        {status === "loading" ? (
          <ListSkeleton count={6} />
        ) : status === "error" ? (
          <ErrorState title="Couldn't load orders" onRetry={() => ordersQ.refetch()} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="No orders yet"
            description="Create an order to track a garment from cutting to delivery, with payments and fittings."
            action={
              <Button onClick={() => router.push("/orders/new")}>
                <Plus />
                Create your first order
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={q ? `No orders match “${search}”` : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} orders`}
            description={q ? "Try a client name, order number or garment." : "Orders in this state will show here."}
            action={
              <Button variant="secondary" onClick={() => { setSearch(""); setFilter("all"); }}>
                Show all orders
              </Button>
            }
          />
        ) : (
          <>
            {filteredBalance > 0 && (
              <p className="mb-3 px-1 text-label text-text-tertiary">
                <span className="tabular">{filtered.length}</span> {filtered.length === 1 ? "order" : "orders"} ·{" "}
                <span className="tabular font-semibold text-ink">{formatMoney(filteredBalance, currency)}</span> still to collect
              </p>
            )}
            <div className="space-y-5">
              {groups.map(g => (
                <section key={g.label} aria-label={g.label}>
                  <h2 className="px-1 pb-1 text-[14px] font-medium text-text-secondary">{g.label}</h2>
                  <div className="divide-y divide-divider/70">
                    {g.orders.map(o => (
                      <OrderRow key={o.id} order={o} clientPhoto={clientPhotos[o.customerId]} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {filtered.length > 0 && filter === "active" && counts.delivered ? (
              <p className="mt-4 text-center text-caption text-text-tertiary">
                Delivered and cancelled orders are under{" "}
                <button className="font-semibold text-olive underline-offset-2 hover:underline" onClick={() => setFilter("all")}>
                  All orders
                </button>
                .
              </p>
            ) : null}
          </>
        )}
      </PageBody>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  );
}
