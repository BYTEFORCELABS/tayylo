"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Filter, SlidersHorizontal, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StatusTag } from "@/components/ui/tag";
import { Button } from "@/components/ui/button";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { orderRepo, customerRepo } from "@/lib/mock/store";
import { getGarmentImage } from "@/lib/mock/seed-data";
import type { Order, OrderStatusName, Customer } from "@/types";

const statusFilters: { key: OrderStatusName | "all"; label: string }[] = [
  { key: "all", label: "All Orders" },
  { key: "pending", label: "Pending" },
  { key: "cutting", label: "Cutting" },
  { key: "sewing", label: "Sewing" },
  { key: "fitting", label: "Fitting" },
  { key: "ready", label: "Ready" },
  { key: "delivered", label: "Delivered" },
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [clients, setClients] = React.useState<Customer[]>([]);
  const [filter, setFilter] = React.useState<OrderStatusName | "all">("all");
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    Promise.all([orderRepo.list(), customerRepo.list()]).then(([o, c]) => {
      setOrders(o);
      setClients(c);
      setLoading(false);
    });
  }, []);

  const filtered = orders.filter(o => {
    if (filter !== "all" && o.statusName !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        o.customerName.toLowerCase().includes(q) ||
        o.number.includes(q) ||
        o.items.some(i => i.garmentType.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <div className="flex items-center justify-between pt-6 pb-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-text-primary">Bespoke Orders</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Production tracking across cutting, sewing & fittings
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => router.push("/orders/new")}>
            <Plus size={16} strokeWidth={2} />
            New Order
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name, order #, or garment cut..."
            className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive shadow-xs"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-4">
          {statusFilters.map(sf => {
            const count = sf.key === "all" ? orders.length : orders.filter(o => o.statusName === sf.key).length;
            const isSelected = filter === sf.key;
            return (
              <button
                key={sf.key}
                onClick={() => setFilter(sf.key)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-olive text-white-warm shadow-xs"
                    : "bg-white-warm border border-border text-text-secondary hover:bg-beige-light"
                }`}
              >
                <span>{sf.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white-warm" : "bg-beige-light text-text-tertiary"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list with Real Garment Photography */}
      <div className="px-4 lg:px-8 pb-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={90} className="rounded-[var(--radius-card)]" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Filter size={24} />}
            title={filter !== "all" ? `No ${filter} orders` : "No orders yet"}
            description={filter !== "all" ? "Try a different filter" : "Create your first order to get started."}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map(o => {
              const paid = o.payments.reduce((s, p) => s + p.amountMinor, 0);
              const balance = o.priceMinor - paid;
              const days = daysUntil(o.dueAt);
              const overdue = days < 0 && !["delivered", "cancelled"].includes(o.statusName);
              const garmentImg = o.items[0]?.imageUrl || getGarmentImage(o.items[0]?.garmentType);
              const client = clients.find(c => c.id === o.customerId);

              return (
                <Card
                  key={o.id}
                  padding="none"
                  className="cursor-pointer hover:border-olive/50 hover:shadow-xs transition-all overflow-hidden group shadow-xs"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3.5">
                      {/* Real Garment Photography Thumbnail */}
                      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-[var(--radius-card)] overflow-hidden shrink-0 border border-border/80 bg-beige-light relative">
                        <img
                          src={garmentImg}
                          alt={o.items[0]?.garmentType || "Garment"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 rounded bg-black/75 text-white-warm backdrop-blur-xs">
                          #{o.number}
                        </span>
                      </div>

                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className="text-sm font-bold text-text-primary truncate">
                            {o.items[0]?.garmentType}
                          </h3>
                          <StatusTag status={overdue ? "overdue" : o.statusName} />
                        </div>

                        {/* Customer Avatar + Name */}
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Avatar
                            name={o.customerName}
                            src={client?.photoUrl}
                            size="sm"
                            className="w-5 h-5 text-[10px]"
                          />
                          <span className="text-xs font-semibold text-text-secondary truncate">
                            {o.customerName}
                          </span>
                        </div>

                        {/* Style Notes */}
                        {o.items[0]?.styleNotes && (
                          <p className="text-xs text-text-tertiary truncate mb-1.5">
                            {o.items[0].styleNotes}
                          </p>
                        )}

                        {/* Financials & Due Date */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <span
                            className={`font-medium ${
                              overdue
                                ? "text-danger"
                                : days <= 3
                                ? "text-warning"
                                : "text-text-tertiary"
                            }`}
                          >
                            {overdue
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                              ? "Due today"
                              : `Due ${formatDate(o.dueAt)}`}
                          </span>

                          <span className="text-border-strong">·</span>

                          <span className="text-text-primary font-mono font-semibold">
                            ₦{(o.priceMinor / 100).toLocaleString()}
                          </span>

                          {balance > 0 && (
                            <span className="text-warning font-semibold text-[11px] bg-warning/10 px-1.5 py-0.5 rounded">
                              ₦{(balance / 100).toLocaleString()} bal
                            </span>
                          )}

                          {balance === 0 && o.priceMinor > 0 && (
                            <span className="text-success font-medium text-[11px]">Paid</span>
                          )}
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-text-tertiary group-hover:text-olive group-hover:translate-x-0.5 transition-all shrink-0 hidden sm:block"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
