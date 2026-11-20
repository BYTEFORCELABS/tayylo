"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, SearchField } from "@/components/ui/choice";
import { List } from "@/components/ui/list";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { OrderListItem } from "@/components/order-list-item";
import { useOrders } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { balanceMinor, isActive, isOverdue, normalizeStatus } from "@/lib/orders";
import { useBusiness } from "@/lib/use-business";
import type { Order, OrderStatusName } from "@/types";

type Filter = "active" | "overdue" | "owing" | OrderStatusName | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "overdue", label: "Overdue" },
  { key: "owing", label: "Balance due" },
  { key: "pending", label: "Pending" },
  { key: "cutting", label: "Cutting" },
  { key: "sewing", label: "Sewing" },
  { key: "fitting", label: "Fitting" },
  { key: "alterations", label: "Alterations" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

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

export default function OrdersPage() {
  const router = useRouter();
  const { currency } = useBusiness();
  const ordersQ = useOrders();
  const orders = React.useMemo(() => ordersQ.data ?? [], [ordersQ.data]);
  const status: "loading" | "ready" | "error" = ordersQ.data ? "ready" : ordersQ.status;
  const [filter, setFilter] = React.useState<Filter>("active");
  const [search, setSearch] = React.useState("");


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
    .sort((a, b) =>
      isActive(a) && isActive(b) ? +new Date(a.dueAt) - +new Date(b.dueAt) : +new Date(b.createdAt) - +new Date(a.createdAt)
    );

  const counts = React.useMemo(() => {
    const c: Partial<Record<Filter, number>> = {};
    FILTERS.forEach(f => (c[f.key] = orders.filter(o => matches(o, f.key)).length));
    return c;
  }, [orders]);

  const visibleFilters = FILTERS.filter(f => ["active", "all"].includes(f.key) || (counts[f.key] ?? 0) > 0 || f.key === filter);
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
          <Button onClick={() => router.push("/orders/new")}>
            <Plus />
            <span className="max-sm:sr-only">New order</span>
          </Button>
        }
      >
        {orders.length > 0 && (
          <div className="space-y-3 pb-4">
            <SearchField value={search} onValueChange={setSearch} placeholder="Search client, order or garment" />
            <div role="toolbar" aria-label="Filter orders" className="-mx-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
              {visibleFilters.map(f => (
                <Chip key={f.key} size="sm" selected={filter === f.key} count={counts[f.key]} onClick={() => setFilter(f.key)}>
                  {f.label}
                </Chip>
              ))}
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
            <List>
              {filtered.map(o => (
                <OrderListItem key={o.id} order={o} />
              ))}
            </List>
            {filtered.length > 0 && filter === "active" && counts.delivered ? (
              <p className="mt-4 text-center text-caption text-text-tertiary">
                Delivered and cancelled orders are under{" "}
                <button className="font-semibold text-olive underline-offset-2 hover:underline" onClick={() => setFilter("all")}>
                  All
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
