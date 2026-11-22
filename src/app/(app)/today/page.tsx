"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Ruler, ClipboardList, UserPlus, ChevronRight, ShoppingCart } from "lucide-react";
import { Panel, TapeRule } from "@/components/ui/card";
import { SuccessMark } from "@/components/brand/success-mark";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { PageBody, PageHeader, Section } from "@/components/ui/page";
import { ErrorState, LoadingRegion, Skeleton, ListSkeleton } from "@/components/ui/states";
import { OrderListItem, OrderRow } from "@/components/order-list-item";
import { RecordPaymentDialog } from "@/components/payment-dialog";
import { NotificationsSheet, useUnreadCount } from "@/components/notifications-sheet";
import { useShell } from "@/components/shell/shell-context";
import { useCustomers, useOrders } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { daysUntil, formatMoney, formatWeekday, greeting } from "@/lib/format";
import { balanceMinor, collectedInMonth, garmentOf, isActive, isOverdue, normalizeStatus } from "@/lib/orders";
import { deriveNotifications } from "@/lib/notifications";
import type { Customer, Order } from "@/types";

/** Garment categories with photos, for the Home "Category" row. */
const CATEGORIES = [
  { key: "suit", label: "Suits", image: "/garments/suit.jpg" },
  { key: "agbada", label: "Agbada", image: "/garments/agbada.jpg" },
  { key: "senator", label: "Senator", image: "/garments/senator.jpg" },
  { key: "kaftan", label: "Kaftan", image: "/garments/kaftan.jpg" },
  { key: "blazer", label: "Blazers", image: "/garments/blazer.jpg" },
  { key: "dress", label: "Dresses", image: "/garments/dress.jpg" },
  { key: "shirt", label: "Shirts", image: "/garments/shirt.jpg" },
  { key: "trousers", label: "Trousers", image: "/garments/trousers.jpg" },
];

export default function TodayPage() {
  const router = useRouter();
  const { openSearch } = useShell();
  const { business, currency } = useBusiness();

  const ordersQ = useOrders();
  const clientsQ = useCustomers();
  const orders = React.useMemo(() => ordersQ.data ?? [], [ordersQ.data]);
  const clients = clientsQ.data ?? [];
  // Show cached data immediately; skeleton only on a true first load.
  const status: "loading" | "ready" | "error" =
    ordersQ.data && clientsQ.data ? "ready" : ordersQ.status === "error" || clientsQ.status === "error" ? "error" : "loading";
  const [payOrder, setPayOrder] = React.useState<Order | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);

  const retry = () => {
    ordersQ.refetch();
    clientsQ.refetch();
  };

  const notifications = React.useMemo(() => deriveNotifications(orders), [orders]);
  const { unread, refresh: refreshUnread } = useUnreadCount(notifications);

  // ---- derived figures (all from real orders) ----
  const now = new Date();
  const active = orders.filter(isActive).sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt));
  const attention = active.filter(o => isOverdue(o) || normalizeStatus(o.statusName) === "ready" || daysUntil(o.dueAt) <= 3);
  const attentionIds = new Set(attention.map(o => o.id));
  const inProgress = active.filter(o => !attentionIds.has(o.id));
  const owing = orders
    .filter(o => normalizeStatus(o.statusName) !== "cancelled" && balanceMinor(o) > 0)
    .sort((a, b) => balanceMinor(b) - balanceMinor(a));
  const outstanding = owing.reduce((s, o) => s + balanceMinor(o), 0);
  const collected = collectedInMonth(orders, now);
  const recentClients = [...clients].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8);
  const monthName = now.toLocaleDateString("en-GB", { month: "long" });
  const firstName = business?.ownerName?.trim().split(/\s+/)[0];

  const header = (
    <PageHeader
      width="lg"
      eyebrow={formatWeekday(now)}
      title={firstName ? `${greeting(now)}, ${firstName}` : greeting(now)}
      actions={
        <>
          <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Search" className="lg:hidden">
            <Search />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setNotifOpen(true)}
            aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
            className="max-lg:border-transparent max-lg:bg-transparent max-lg:bg-none max-lg:shadow-none"
          >
            <Bell />
            {unread > 0 && (
              <span
                aria-hidden
                className="tabular absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D93A2B] px-1 text-[10.5px] font-bold leading-none text-white ring-2 ring-canvas animate-scale-in"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </>
      }
    />
  );

  if (status === "loading") {
    return (
      <>
        {header}
        <PageBody width="lg">
          <LoadingRegion label="Loading home">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              <div className="space-y-8">
                <Skeleton variant="rectangular" height={232} className="rounded-[var(--radius-panel)]" />
                <ListSkeleton count={3} />
              </div>
              <div className="space-y-8">
                <ListSkeleton count={3} />
              </div>
            </div>
          </LoadingRegion>
        </PageBody>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        {header}
        <ErrorState
          title="Couldn't load home"
          onRetry={retry}
        />
      </>
    );
  }

  const isNewWorkspace = clients.length === 0 && orders.length === 0;

  return (
    <>
      {header}
      <PageBody width="lg" className="pt-1">
        {isNewWorkspace ? (
          <GettingStarted businessName={business?.name} />
        ) : (
          <>
          <MobileHome
            collected={collected}
            outstanding={outstanding}
            currency={currency}
            monthName={monthName}
            active={active}
            orders={orders}
            clients={clients}
            onMeasure={() => router.push("/measure")}
            onNewOrder={() => router.push("/orders/new")}
          />
          <div className="hidden gap-x-10 gap-y-8 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            {/* -------- primary column -------- */}
            <div className="min-w-0">
              <Panel className="animate-rise-in">
                <p className="text-label font-medium text-text-on-panel-muted">Collected in {monthName}</p>
                <p className="tabular mt-2 text-display text-text-inverse">{formatMoney(collected, currency)}</p>

                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
                  <div>
                    <dt className="text-caption text-text-on-panel-muted">Outstanding</dt>
                    <dd className="tabular mt-1 text-[17px] font-semibold">{formatMoney(outstanding, currency)}</dd>
                    <dd className="text-caption text-text-on-panel-muted">
                      {owing.length} {owing.length === 1 ? "order" : "orders"} owing
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-text-on-panel-muted">In production</dt>
                    <dd className="tabular mt-1 text-[17px] font-semibold">{active.length} {active.length === 1 ? "order" : "orders"}</dd>
                    <dd className="text-caption text-text-on-panel-muted">
                      {active.filter(o => {
                        const d = daysUntil(o.dueAt);
                        return d >= 0 && d <= 7;
                      }).length}{" "}
                      due this week
                    </dd>
                  </div>
                </dl>

                <div className="mt-6 flex gap-2.5">
                  <Button variant="inverse" className="flex-1" onClick={() => router.push("/measure")}>
                    <Ruler />
                    Measure
                  </Button>
                  <Button variant="inverse-ghost" className="flex-1" onClick={() => router.push("/orders/new")}>
                    <ClipboardList />
                    New order
                  </Button>
                </div>
              </Panel>

              <Section
                title="Needs attention"
                description={attention.length > 0 ? "Overdue, due within 3 days, or ready to collect" : undefined}
                className="mt-8"
              >
                {attention.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-4 border border-border/70">
                    <SuccessMark size={34} animated={false} />
                    <p className="text-label text-text-secondary">Nothing urgent. Every active order is on schedule.</p>
                  </div>
                ) : (
                  <List>
                    {attention.slice(0, 5).map(o => (
                      <OrderListItem key={o.id} order={o} />
                    ))}
                  </List>
                )}
              </Section>

              {inProgress.length > 0 && (
                <Section title="In production" action={{ label: "All orders", href: "/orders" }}>
                  <List>
                    {inProgress.slice(0, 5).map(o => (
                      <OrderListItem key={o.id} order={o} />
                    ))}
                  </List>
                </Section>
              )}
            </div>

            {/* -------- secondary column -------- */}
            <div className="min-w-0 space-y-8 lg:pt-0">
              <Section
                title="Balances to collect"
                trailing={
                  owing.length > 0 ? (
                    <span className="tabular text-label font-semibold text-text-secondary">{formatMoney(outstanding, currency)}</span>
                  ) : undefined
                }
                className="mt-0"
              >
                {owing.length === 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-border/70 bg-surface px-4 py-4 text-label text-text-secondary">
                    No outstanding balances. Every order is paid up.
                  </div>
                ) : (
                  <List>
                    {owing.slice(0, 5).map(o => (
                      <ListItem
                        key={o.id}
                        leading={<Avatar name={o.customerName} src={clients.find(c => c.id === o.customerId)?.photoUrl} />}
                        title={o.customerName}
                        subtitle={`${garmentOf(o)} · #${o.number}`}
                        trailing={
                          <span className="flex items-center gap-3">
                            <span className="tabular text-[15px] font-semibold text-ink">
                              {formatMoney(balanceMinor(o), o.currency)}
                            </span>
                            <Button variant="tonal" size="sm" onClick={() => setPayOrder(o)}>
                              Collect
                            </Button>
                          </span>
                        }
                      />
                    ))}
                  </List>
                )}
                {owing.length > 5 && (
                  <Link
                    href="/orders"
                    className="mt-2 inline-flex items-center gap-0.5 px-1 text-label font-semibold text-olive"
                  >
                    {owing.length - 5} more with a balance <ChevronRight size={16} />
                  </Link>
                )}
              </Section>

              {recentClients.length > 0 && (
                <Section title="Recent clients" action={{ label: `All ${clients.length}`, href: "/clients" }}>
                  <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-2 sm:overflow-visible sm:px-0">
                    {recentClients.map(c => (
                      <Link
                        key={c.id}
                        href={`/clients/${c.id}`}
                        className="flex w-[76px] shrink-0 flex-col items-center gap-2 rounded-[var(--radius-card)] py-3 transition-colors hover:bg-surface sm:w-auto"
                      >
                        <Avatar name={c.fullName} src={c.photoUrl} size="lg" />
                        <span className="w-full truncate px-1 text-center text-caption font-medium text-text-secondary">
                          {c.fullName.split(" ")[0]}
                        </span>
                      </Link>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
          </>
        )}
      </PageBody>

      <RecordPaymentDialog order={payOrder} onOpenChange={o => !o && setPayOrder(null)} onRecorded={() => {}} />
      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} items={notifications} onSeen={refreshUnread} />
    </>
  );
}

/** First-run: real next steps instead of an empty dashboard. */
function GettingStarted({ businessName }: { businessName?: string }) {
  const steps = [
    {
      icon: <UserPlus />,
      title: "Add your first client",
      desc: "Name and phone number is all you need",
      href: "/clients?add=true",
    },
    {
      icon: <Ruler />,
      title: "Record their measurements",
      desc: "Fast keypad with tailor fractions",
      href: "/measure",
    },
    {
      icon: <ClipboardList />,
      title: "Create an order",
      desc: "Price, deposit and due date in one place",
      href: "/orders/new",
    },
  ];
  return (
    <div className="mx-auto max-w-xl animate-rise-in">
      <Panel>
        <p className="text-label font-medium text-text-on-panel-muted">Welcome to Tayylo</p>
        <p className="mt-2 text-title text-text-inverse">{businessName ? `${businessName} is ready.` : "Your workspace is ready."}</p>
        <p className="mt-2 text-label text-text-on-panel-muted">
          Three steps and you&apos;ll never search a notebook for a measurement again.
        </p>
      </Panel>
      <List className="mt-6">
        {steps.map((s, i) => (
          <ListItem
            key={s.title}
            href={s.href}
            leading={
              <IconTile tone="olive" size="lg">
                {s.icon}
              </IconTile>
            }
            title={`${i + 1}. ${s.title}`}
            subtitle={s.desc}
            chevron
          />
        ))}
      </List>
    </div>
  );
}

// ------------------------------------------------------------ phone layout

function MobileHome({
  collected,
  outstanding,
  currency,
  monthName,
  active,
  orders,
  clients,
  onMeasure,
  onNewOrder,
}: {
  collected: number;
  outstanding: number;
  currency: string;
  monthName: string;
  active: Order[];
  orders: Order[];
  clients: Customer[];
  onMeasure: () => void;
  onNewOrder: () => void;
}) {
  const photos = Object.fromEntries(clients.map(c => [c.id, c.photoUrl])) as Record<string, string | undefined>;
  // Categories the studio actually sews come first.
  const used = (key: string) => orders.filter(o => o.items.some(i => i.garmentType.toLowerCase().includes(key))).length;
  const categories = [...CATEGORIES].sort((a, b) => used(b.key) - used(a.key));

  return (
    <div className="animate-rise-in lg:hidden">
      {/* Summary: this month's takings on a white card inside the dark panel */}
      <div className="rounded-[28px] bg-panel p-2 text-text-inverse">
        <div className="relative overflow-hidden rounded-[22px] bg-surface-raised px-4 pt-8 pb-5 text-center text-ink">
          <TapeRule className="h-6 text-ink opacity-25" />
          <p className="text-label text-text-secondary">Collected in {monthName}</p>
          <p className="tabular mt-1 text-[32px] font-semibold leading-tight tracking-tight">{formatMoney(collected, currency)}</p>
        </div>
        <div className="grid grid-cols-2 gap-1 px-1 pt-1">
          <PanelStat
            href="/orders?filter=owing"
            label="Outstanding balance"
            value={formatMoney(outstanding, currency)}
          />
          <PanelStat
            href="/orders?filter=active"
            label="In production"
            value={`${active.length} ${active.length === 1 ? "order" : "orders"}`}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button size="lg" onClick={onMeasure}>
          <Ruler />
          Measure
        </Button>
        <Button size="lg" variant="secondary" onClick={onNewOrder}>
          <ShoppingCart />
          New order
        </Button>
      </div>

      {/* Category */}
      <section className="mt-7" aria-label="Category">
        <Link href="/orders" className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-[17px] font-medium text-text-secondary">Category</h2>
          <ChevronRight size={20} strokeWidth={1.75} className="text-text-tertiary" />
        </Link>
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none">
          {categories.map(c => (
            <Link
              key={c.key}
              href={`/orders?q=${encodeURIComponent(c.label.replace(/e?s$/, ""))}`}
              className="w-[124px] shrink-0 rounded-[18px] border border-border/60 bg-surface-raised p-1.5 transition-transform active:scale-[0.98]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static local photos */}
              <img src={c.image} alt="" className="aspect-[1/1] w-full rounded-[13px] object-cover" loading="lazy" />
              <span className="block px-1 pt-1.5 pb-0.5 text-[14px] text-text-secondary">{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Active orders */}
      <section className="mt-7" aria-label="Active orders">
        <Link href="/orders" className="mb-1 flex items-center justify-between px-1">
          <h2 className="flex items-center gap-2 text-[17px] font-medium text-text-secondary">
            Active orders
            <span className="tabular rounded-[6px] bg-surface-sunken px-1.5 text-[12px] leading-5 text-text-secondary">{active.length}</span>
          </h2>
          <ChevronRight size={20} strokeWidth={1.75} className="text-text-tertiary" />
        </Link>
        {active.length === 0 ? (
          <p className="rounded-[var(--radius-card)] border border-border/70 bg-surface px-4 py-4 text-label text-text-secondary">
            No active orders. Tap New order to start one.
          </p>
        ) : (
          <div className="divide-y divide-divider/70">
            {active.slice(0, 6).map(o => (
              <OrderRow key={o.id} order={o} clientPhoto={photos[o.customerId]} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** A tappable figure on the dark summary card. */
function PanelStat({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="group min-w-0 rounded-[18px] px-3 py-3 transition-colors hover:bg-white/[0.06] active:bg-white/10"
    >
      <span className="flex items-center justify-between gap-1 text-caption text-text-on-panel-muted">
        {label}
        <ChevronRight size={15} strokeWidth={2} className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5" />
      </span>
      <span className="tabular mt-1 block truncate text-[19px] font-semibold text-text-inverse">{value}</span>
    </Link>
  );
}
