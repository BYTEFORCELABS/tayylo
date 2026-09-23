"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  SlidersHorizontal,
  Bell,
  Plus,
  Ruler,
  ShoppingBag,
  CreditCard,
  X,
  ChevronRight,
  Sun,
  Moon,
  Shirt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { StatusTag } from "@/components/ui/tag";
import { Skeleton } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  businessRepo,
  customerRepo,
  orderRepo,
} from "@/lib/mock/store";
import { garmentCategories, getGarmentImage } from "@/lib/mock/seed-data";
import type { Business, Customer, Order } from "@/types";
import { toast } from "sonner";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function formatCurrency(minor: number, currency: string = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, minimumFractionDigits: 0 }).format(minor / 100);
}

function daysUntil(dateStr: string) {
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  return Math.ceil(diff);
}

export default function TodayPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [business, setBusiness] = React.useState<Business | null>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [allClients, setAllClients] = React.useState<Customer[]>([]);
  const [recentClients, setRecentClients] = React.useState<Customer[]>([]);
  const [search, setSearch] = React.useState("");

  // Filter category
  const [selectedCategory, setSelectedCategory] = React.useState("all");

  // Theme state
  const [currentTheme, setCurrentTheme] = React.useState<"light" | "dark">("light");

  // Notifications Modal
  const [showNotifications, setShowNotifications] = React.useState(false);

  // Quick Payment Modal from Balances
  const [payOrder, setPayOrder] = React.useState<Order | null>(null);
  const [payAmount, setPayAmount] = React.useState("");
  const [payMethod, setPayMethod] = React.useState("Transfer");
  const [savingPay, setSavingPay] = React.useState(false);

  // Summary card carousel
  const cardScrollRef = React.useRef<HTMLDivElement>(null);
  const [cardIndex, setCardIndex] = React.useState(0);
  const handleCardScroll = () => {
    const el = cardScrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / (el.clientWidth * 0.88 + 12));
    setCardIndex(Math.max(0, Math.min(2, index)));
  };

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("tayylo_theme");
      if (saved === "dark") {
        setCurrentTheme("dark");
      } else {
        setCurrentTheme("light");
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    const next = currentTheme === "light" ? "dark" : "light";
    setCurrentTheme(next);
    try {
      localStorage.setItem("tayylo_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
        toast("Atelier Dark Mode enabled");
      } else {
        document.documentElement.classList.remove("dark");
        toast("Warm Beige Light Mode enabled");
      }
    } catch {}
  };

  React.useEffect(() => {
    async function load() {
      const [biz, ords, clients] = await Promise.all([
        businessRepo.get(),
        orderRepo.list(),
        customerRepo.list(),
      ]);
      setBusiness(biz);
      setOrders(ords);
      setAllClients(clients);
      setRecentClients(clients.slice(0, 8));
      setLoading(false);
    }
    load();
  }, []);

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.statusName));
  const overdueOrders = activeOrders.filter(o => daysUntil(o.dueAt) < 0);
  const dueThisWeek = activeOrders.filter(o => {
    const d = daysUntil(o.dueAt);
    return d >= 0 && d <= 7;
  });

  const withBalance = orders
    .filter(o => !["delivered", "cancelled"].includes(o.statusName))
    .map(o => {
      const paid = o.payments.reduce((s, p) => s + p.amountMinor, 0);
      const balance = o.priceMinor - paid;
      return { ...o, balance };
    })
    .filter(o => o.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  // Summary card stats
  const now = new Date();
  const collectedThisMonth = orders.reduce((sum, o) => {
    const monthPayments = o.payments.filter(p => {
      const d = new Date(p.paidAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return sum + monthPayments.reduce((s, p) => s + p.amountMinor, 0);
  }, 0);
  const outstandingTotal = withBalance.reduce((s, o) => s + o.balance, 0);
  const activeOrdersValue = activeOrders.reduce((s, o) => s + o.priceMinor, 0);

  const summaryCards = [
    {
      label: "Collected this month",
      value: formatCurrency(collectedThisMonth),
      caption: `${activeOrders.length} orders in progress`,
      className: "bg-olive-deep",
    },
    {
      label: "Outstanding balance",
      value: formatCurrency(outstandingTotal),
      caption: `${withBalance.length} client${withBalance.length === 1 ? "" : "s"} owing`,
      className: "bg-warning",
    },
    {
      label: "Active pipeline value",
      value: formatCurrency(activeOrdersValue),
      caption: `${dueThisWeek.length} due this week`,
      className: "bg-text-primary",
    },
  ];

  // Quick payment handler
  const handleQuickPayment = async () => {
    if (!payOrder) return;
    const num = parseFloat(payAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    setSavingPay(true);
    await orderRepo.addPayment(payOrder.id, {
      amountMinor: Math.round(num * 100),
      method: payMethod,
    });
    const updatedOrders = await orderRepo.list();
    setOrders(updatedOrders);
    toast.success(`Payment of ₦${num.toLocaleString()} recorded for ${payOrder.customerName}`);
    setSavingPay(false);
    setPayOrder(null);
    setPayAmount("");
  };

  // Instant search results
  const q = search.trim().toLowerCase();
  const searchResultsClients = q
    ? allClients.filter(c => c.fullName.toLowerCase().includes(q) || c.phones.some(p => p.includes(q)))
    : [];
  const searchResultsOrders = q
    ? orders.filter(o => o.customerName.toLowerCase().includes(q) || o.number.includes(q) || o.items[0]?.garmentType.toLowerCase().includes(q))
    : [];
  const hasSearchResults = q.length > 0;

  // Filtered orders by category
  const filteredActiveOrders = activeOrders.filter(o => {
    if (selectedCategory === "all") return true;
    const gType = o.items[0]?.garmentType.toLowerCase() || "";
    return gType.includes(selectedCategory.toLowerCase().slice(0, 4));
  });

  if (loading) {
    return (
      <div className="px-4 pt-safe max-w-3xl mx-auto">
        <div className="pt-8 pb-4 space-y-3">
          <Skeleton width={200} height={28} />
          <Skeleton width={280} height={16} />
        </div>
        <Skeleton width="100%" height={44} className="mb-4 rounded-[var(--radius-input)]" />
        <Skeleton width="100%" height={180} className="mb-4 rounded-[var(--radius-card)]" />
        <div className="flex gap-3 mb-6 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} variant="circular" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 w-full">
      {/* ============================================================ */}
      {/* 1. TOP BAR: Tailor Profile Avatar, Greeting, Theme Toggle & Notification Bell */}
      {/* Fixed on scroll so context is never lost */}
      {/* ============================================================ */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
      <div className="flex items-center justify-between gap-2 pt-5 pb-4 w-full max-w-3xl mx-auto">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-1">
          <Avatar
            name={business?.ownerName || "Ijeoma"}
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
            size="md"
            className="w-11 h-11 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-text-tertiary">{formatDate(new Date())}</p>
            <h1 className="font-serif text-xl sm:text-2xl text-text-primary font-bold tracking-tight truncate mt-0.5">
              {getGreeting()}, {business?.ownerName || "Ijeoma"}
            </h1>
          </div>
        </div>

        {/* Right Actions: Theme Toggle & Notification Bell */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-beige-light transition-colors active:scale-[0.95]"
            title={currentTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            aria-label="Toggle Theme"
          >
            {currentTheme === "dark" ? (
              <Sun size={19} strokeWidth={1.75} />
            ) : (
              <Moon size={19} strokeWidth={1.75} />
            )}
          </button>

          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-10 h-10 rounded-full flex items-center justify-center text-text-primary hover:bg-beige-light transition-colors active:scale-[0.95]"
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={1.75} />
            {overdueOrders.length > 0 && (
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger" />
            )}
          </button>
        </div>
      </div>
      </div>

      <div className="px-4 lg:px-8 max-w-3xl mx-auto w-full">
      {/* ============================================================ */}
      {/* SUMMARY CARD CAROUSEL */}
      {/* ============================================================ */}
      <div className="mb-6 -mx-4">
        <div
          ref={cardScrollRef}
          onScroll={handleCardScroll}
          className="flex gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory px-4"
        >
          {summaryCards.map(c => (
            <div
              key={c.label}
              className={`snap-center shrink-0 w-[88%] sm:w-[360px] rounded-3xl p-5 text-white-warm relative overflow-hidden ${c.className}`}
            >
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, #FFFDF8 1px, transparent 0)`,
                  backgroundSize: "20px 20px",
                }}
              />
              <p className="text-xs font-medium text-white-warm/70 relative z-10">{c.label}</p>
              <p className="text-3xl font-bold tracking-tight mt-1.5 relative z-10">{c.value}</p>
              <p className="text-xs text-white-warm/60 mt-3 relative z-10">{c.caption}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {summaryCards.map((c, i) => (
            <span
              key={c.label}
              className={`h-1.5 rounded-full transition-all ${
                i === cardIndex ? "w-5 bg-olive" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. PILL SEARCH BAR WITH FILTER ICON */}
      {/* ============================================================ */}
      <div className="relative mb-5">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients, styles, or order #..."
          className="w-full h-12 pl-11 pr-11 rounded-full border-none bg-beige-light text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive transition-shadow"
        />
        <button
          onClick={() => {
            if (search) setSearch("");
            else router.push("/orders");
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-beige-light transition-colors"
          title="Filter or Clear"
        >
          {search ? <X size={17} /> : <SlidersHorizontal size={17} strokeWidth={1.75} />}
        </button>

        {/* Live Dropdown Results with Garment & Client Photos */}
        {hasSearchResults && (
          <div className="absolute top-14 left-0 right-0 z-40 bg-white-warm rounded-[var(--radius-card)] border border-border shadow-dialog overflow-hidden max-h-96 overflow-y-auto">
            {searchResultsClients.length === 0 && searchResultsOrders.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-secondary">
                No bespoke clients or orders matching "{search}"
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {searchResultsClients.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-olive px-3 py-1.5">
                      Clients ({searchResultsClients.length})
                    </p>
                    {searchResultsClients.slice(0, 4).map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          router.push(`/clients/${c.id}`);
                          setSearch("");
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-[var(--radius-sm)] hover:bg-beige-light/60 cursor-pointer transition-colors"
                      >
                        <Avatar name={c.fullName} src={c.photoUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{c.fullName}</p>
                          <p className="text-xs text-text-secondary">{c.phones[0] || "No phone recorded"}</p>
                        </div>
                        <span className="text-xs text-olive font-semibold flex items-center gap-0.5">
                          Profile <ChevronRight size={14} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {searchResultsOrders.length > 0 && (
                  <div className="p-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-olive px-3 py-1.5">
                      Garment Orders ({searchResultsOrders.length})
                    </p>
                    {searchResultsOrders.slice(0, 4).map(o => (
                      <div
                        key={o.id}
                        onClick={() => {
                          router.push(`/orders/${o.id}`);
                          setSearch("");
                        }}
                        className="flex items-center gap-3 p-2.5 rounded-[var(--radius-sm)] hover:bg-beige-light/60 cursor-pointer transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-border/70 relative">
                          <img
                            src={o.items[0]?.imageUrl || getGarmentImage(o.items[0]?.garmentType)}
                            alt={o.items[0]?.garmentType}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">
                            #{o.number} · {o.items[0]?.garmentType}
                          </p>
                          <p className="text-xs text-text-secondary truncate">{o.customerName}</p>
                        </div>
                        <StatusTag status={o.statusName} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. QUICK ACTIONS */}
      {/* ============================================================ */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => router.push("/measure")}
          className="flex-1 min-w-0 h-11 px-4 rounded-[var(--radius-button)] bg-olive text-white-warm text-sm font-semibold hover:bg-olive-deep transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <Ruler size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">Measure</span>
        </button>
        <button
          onClick={() => router.push("/orders/new")}
          className="flex-1 min-w-0 h-11 px-4 rounded-[var(--radius-button)] border border-border bg-white-warm text-text-primary text-sm font-semibold hover:bg-beige-light transition-colors active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <ShoppingBag size={16} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">New order</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* 4. CIRCULAR GARMENT CATEGORIES STRIP (Directly from Reference 1) */}
      {/* ============================================================ */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-serif font-bold text-text-primary">Garment Categories</h2>
          <button
            onClick={() => router.push("/measure")}
            className="text-xs font-semibold text-olive flex items-center gap-0.5"
          >
            All templates <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 pb-2">
          {garmentCategories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="flex flex-col items-center gap-1.5 shrink-0 snap-start w-20 group transition-transform active:scale-[0.96]"
              >
                <div
                  className={`w-20 h-24 rounded-xl overflow-hidden transition-all ${
                    isSelected ? "ring-2 ring-olive" : "ring-1 ring-border"
                  }`}
                >
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className={`text-xs text-center transition-colors ${
                    isSelected ? "font-bold text-olive" : "font-medium text-text-primary"
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. ACTIVE BESPOKE ORDERS PIPELINE WITH REAL GARMENT PHOTOS */}
      {/* ============================================================ */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-serif font-bold text-text-primary">
            Active orders ({filteredActiveOrders.length})
          </h2>
          <button
            onClick={() => router.push("/orders")}
            className="text-xs font-semibold text-olive flex items-center gap-0.5"
          >
            View all <ChevronRight size={14} />
          </button>
        </div>

        {filteredActiveOrders.length === 0 ? (
          <Card padding="md" className="text-center py-8 shadow-none border-none bg-beige-light">
            <p className="text-xs text-text-secondary">No active orders in this garment category</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="mt-2 text-xs"
            >
              Show all garments
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredActiveOrders.slice(0, 5).map(o => {
              const days = daysUntil(o.dueAt);
              const isOverdue = days < 0;
              const garmentImg = o.items[0]?.imageUrl;

              return (
                <Card
                  key={o.id}
                  padding="none"
                  className="overflow-hidden border-none shadow-none cursor-pointer group"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <CardContent className="p-0">
                    <div className="flex items-center gap-3.5">
                      {/* Garment photo when we have a real one, otherwise a plain
                          icon tile — avoids showing the same stock photo for
                          multiple different orders */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[var(--radius-card)] overflow-hidden shrink-0 bg-beige-light flex items-center justify-center">
                        {garmentImg ? (
                          <img
                            src={garmentImg}
                            alt={o.items[0]?.garmentType || "Garment"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Shirt size={24} strokeWidth={1.5} className="text-text-tertiary" />
                        )}
                      </div>

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-text-primary truncate">
                          {o.items[0]?.garmentType}
                        </h4>
                        <p className="text-xs text-text-secondary truncate mt-0.5">
                          {o.customerName}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-text-primary font-mono font-semibold">
                            {formatCurrency(o.priceMinor, o.currency)}
                          </span>
                          <span className="text-border-strong">·</span>
                          <span
                            className={`text-xs font-medium ${
                              isOverdue ? "text-danger" : days <= 3 ? "text-warning" : "text-text-tertiary"
                            }`}
                          >
                            {isOverdue
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                              ? "Due today"
                              : `Due in ${days}d`}
                          </span>
                        </div>
                      </div>

                      <StatusTag status={isOverdue ? "overdue" : o.statusName} className="shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* 7. RECENT CLIENTS STRIP WITH REAL PHOTO AVATARS */}
      {/* ============================================================ */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-serif font-bold text-text-primary">Bespoke Clients</h2>
            <p className="text-xs text-text-tertiary">Quick access to measurement records</p>
          </div>
          <button
            onClick={() => router.push("/clients")}
            className="text-xs font-semibold text-olive hover:underline flex items-center gap-0.5"
          >
            View all ({allClients.length}) <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2">
          {recentClients.map(c => (
            <button
              key={c.id}
              onClick={() => router.push(`/clients/${c.id}`)}
              className="flex flex-col items-center gap-2 shrink-0 p-3 rounded-[var(--radius-card)] bg-beige-light hover:bg-beige transition-colors min-w-[92px] active:scale-[0.97] group"
            >
              <div className="relative">
                <Avatar
                  name={c.fullName}
                  src={c.photoUrl}
                  size="lg"
                  className="ring-2 ring-transparent group-hover:ring-olive/40 transition-all"
                />
                {c.tags.includes("VIP") && (
                  <span className="absolute -top-1 -right-1 px-1 rounded bg-olive text-[8px] font-bold text-white-warm">
                    VIP
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-text-primary text-center truncate w-full">
                {c.fullName.split(" ")[0]}
              </span>
              <span className="text-[10px] text-text-tertiary">
                {c.media && c.media.length > 0 ? `${c.media.length} garments` : "Measured"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. OUTSTANDING BALANCES (Tap to collect payment) */}
      {/* ============================================================ */}
      {withBalance.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-base font-serif font-bold text-text-primary">Outstanding Balances</h2>
            <span className="text-xs text-text-tertiary">Tap to record payment</span>
          </div>
          <Card padding="none" className="overflow-hidden shadow-none">
            <CardContent>
              {withBalance.slice(0, 4).map((o, i) => {
                const client = allClients.find(c => c.id === o.customerId);
                return (
                  <div
                    key={o.id}
                    className={`flex items-center justify-between w-full px-4 py-3.5 hover:bg-beige-light/50 transition-colors text-left ${
                      i < withBalance.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <button
                      onClick={() => router.push(`/orders/${o.id}`)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <Avatar name={o.customerName} src={client?.photoUrl} size="sm" />
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-text-primary block truncate">
                          {o.customerName}
                        </span>
                        <span className="text-xs text-text-secondary">
                          #{o.number} · {o.items[0]?.garmentType}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-warning font-mono">
                        {formatCurrency(o.balance, o.currency)}
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-xs font-semibold"
                        onClick={() => {
                          setPayOrder(o);
                          setPayAmount((o.balance / 100).toString());
                        }}
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
      </div>

      {/* Quick Payment Modal */}
      <Dialog open={!!payOrder} onOpenChange={open => { if (!open) setPayOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} className="text-olive" />
              Collect Balance Payment
            </DialogTitle>
            <DialogDescription>
              Record payment for <strong>{payOrder?.customerName}</strong> (Order #{payOrder?.number}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Payment Amount (₦)
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="w-full h-11 px-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-olive font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Method</label>
              <div className="grid grid-cols-2 gap-2">
                {["Transfer", "Cash", "Card / POS", "Mobile Money"].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`h-9 rounded-[var(--radius-button)] text-xs font-medium border transition-colors ${
                      payMethod === m
                        ? "bg-olive text-white-warm border-olive"
                        : "bg-white-warm text-text-primary border-border hover:bg-beige-light"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="secondary" onClick={() => setPayOrder(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleQuickPayment} disabled={savingPay}>
              {savingPay ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Modal (Reference 1 Right Screen) */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell size={18} className="text-olive" />
              Atelier Notifications
            </DialogTitle>
            <DialogDescription>
              Updates on fabric arrivals, fittings, and order milestones
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-[var(--radius-card)] bg-beige-light/40 border border-border flex items-start gap-3">
              <Avatar
                name="John Smith"
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"
                size="md"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-text-primary">
                  Fitting session scheduled for 10:00 AM
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  John Smith · Navy 3-Piece Bespoke Suit
                </p>
                <span className="text-[10px] text-text-tertiary">20 mins ago</span>
              </div>
            </div>

            <div className="p-3 rounded-[var(--radius-card)] bg-white-warm border border-border flex items-start gap-3">
              <Avatar
                name="Ijeoma Okafor"
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"
                size="md"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-text-primary">
                  Fabric delivery confirmed: Emerald Silk
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Ready for cutting phase · Order #1002
                </p>
                <span className="text-[10px] text-text-tertiary">2 hours ago</span>
              </div>
            </div>

            <div className="p-3 rounded-[var(--radius-card)] bg-white-warm border border-border flex items-start gap-3">
              <Avatar
                name="Kofi Mensah"
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
                size="md"
              />
              <div className="flex-1">
                <p className="text-xs font-semibold text-text-primary">
                  Balance payment completed (₦70,000)
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  White & Gold Royal Agbada · Ready for pickup
                </p>
                <span className="text-[10px] text-text-tertiary">Yesterday</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="primary" onClick={() => setShowNotifications(false)} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
