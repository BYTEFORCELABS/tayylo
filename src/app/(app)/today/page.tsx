"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, Ruler, ClipboardList, UserPlus, CheckCircle2, ChevronRight } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { PageBody, PageHeader, Section } from "@/components/ui/page";
import { ErrorState, LoadingRegion, Skeleton, ListSkeleton } from "@/components/ui/states";
import { OrderListItem } from "@/components/order-list-item";
import { RecordPaymentDialog } from "@/components/payment-dialog";
import { NotificationsSheet, useUnreadCount } from "@/components/notifications-sheet";
import { useShell } from "@/components/shell/shell-context";
import { useCustomers, useOrders } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { daysUntil, formatMoney, formatWeekday, greeting } from "@/lib/format";
import { balanceMinor, collectedInMonth, garmentOf, isActive, isOverdue, normalizeStatus } from "@/lib/orders";
import { deriveNotifications } from "@/lib/notifications";
import type { Order } from "@/types";

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
          <Button variant="secondary" size="icon" onClick={openSearch} aria-label="Search" className="lg:hidden">
            <Search />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setNotifOpen(true)}
            aria-label={unread > 0 ? `Notifications, ${unread} new` : "Notifications"}
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
          <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
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
                    <IconTile tone="success" size="sm">
                      <CheckCircle2 />
                    </IconTile>
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
