"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Search,
  Users,
  ShoppingBag,
  Ruler,
  Settings,
  CalendarDays,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import { Avatar } from "./avatar";
import { GarmentIcon } from "@/components/brand/garment-icon";
import { StatusTag } from "./tag";
import { useCustomers, useOrders } from "@/lib/queries";
import { displayStatus, garmentOf, isActive } from "@/lib/orders";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Global search: clients, orders, actions and pages in one place.
 * Opened from the search buttons in the shell and with ⌘K / Ctrl+K.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-ink/40 backdrop-blur-[2px] animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-3 top-[max(12px,env(safe-area-inset-top))] z-[61] mx-auto max-w-xl animate-scale-in sm:top-[12vh] focus-visible:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Search Tayylo</DialogPrimitive.Title>
          {open && <PaletteBody onOpenChange={onOpenChange} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function PaletteBody({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const clientsQ = useCustomers();
  const ordersQ = useOrders();
  const clients = clientsQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const loading = !clientsQ.data || !ordersQ.data ? clientsQ.status === "loading" || ordersQ.status === "loading" : false;
  const failed = clientsQ.status === "error" || ordersQ.status === "error";
  const [query, setQuery] = React.useState("");

  const go = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  const hasQuery = query.trim().length > 0;
  const visibleOrders = hasQuery ? orders : orders.filter(isActive);

  return (
          <Command
            label="Search Tayylo"
            className="overflow-hidden rounded-[var(--radius-dialog)] bg-surface-raised shadow-[var(--shadow-dialog)]"
          >
            <div className="flex items-center gap-3 border-b border-divider px-5">
              <Search size={20} strokeWidth={1.75} className="shrink-0 text-text-tertiary" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                autoFocus
                placeholder="Search clients, orders or actions"
                className="h-14 flex-1 bg-transparent text-[16px] text-ink placeholder:text-text-tertiary focus:outline-none"
              />
              <kbd className="hidden h-6 items-center rounded-[var(--radius-xs)] bg-surface-sunken px-2 text-[11px] font-semibold text-text-tertiary sm:inline-flex">
                Esc
              </kbd>
            </div>

            <Command.List className="max-h-[min(60vh,480px)] overflow-y-auto p-2 scroll-py-2">
              {loading && (
                <Command.Loading>
                  <p className="px-3 py-6 text-center text-label text-text-tertiary">Loading your workspace…</p>
                </Command.Loading>
              )}
              {failed && (
                <p className="px-3 py-3 text-label text-danger">Couldn&apos;t load clients and orders. Actions still work.</p>
              )}
              <Command.Empty className="px-3 py-10 text-center">
                <p className="text-[15px] font-semibold text-ink">No results</p>
                <p className="mt-1 text-label text-text-tertiary">Try a client name, phone number or order number.</p>
              </Command.Empty>

              {clients.length > 0 && (
                <Group heading="Clients">
                  {(hasQuery ? clients : clients.slice(0, 5)).map(c => (
                    <Item
                      key={c.id}
                      value={`client ${c.fullName} ${c.phones.join(" ")} ${c.email ?? ""}`}
                      onSelect={() => go(`/clients/${c.id}`)}
                      icon={<Avatar name={c.fullName} src={c.photoUrl} size="sm" />}
                      meta={c.phones[0]}
                    >
                      {c.fullName}
                    </Item>
                  ))}
                </Group>
              )}

              {visibleOrders.length > 0 && (
                <Group heading={hasQuery ? "Orders" : "Active orders"}>
                  {(hasQuery ? visibleOrders : visibleOrders.slice(0, 5)).map(o => (
                    <Item
                      key={o.id}
                      value={`order ${o.number} ${o.customerName} ${garmentOf(o)}`}
                      onSelect={() => go(`/orders/${o.id}`)}
                      icon={
                        o.items[0]?.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- fabric thumbnail (data URL / local)
                          <img src={o.items[0].imageUrl} alt="" className="size-8 rounded-[var(--radius-xs)] object-cover" />
                        ) : (
                          <GarmentIcon garment={garmentOf(o)} size={24} label="" className="text-ink" />
                        )
                      }
                      meta={<StatusTag status={displayStatus(o)} appearance="dot" />}
                    >
                      {garmentOf(o)} <span className="text-text-tertiary">· {o.customerName} · #{o.number}</span>
                    </Item>
                  ))}
                </Group>
              )}

              <Group heading="Actions">
                <Item value="add new client" onSelect={() => go("/clients?add=true")} icon={<UserPlus size={18} strokeWidth={1.75} />}>
                  Add client
                </Item>
                <Item value="record measurements measure" onSelect={() => go("/measure")} icon={<Ruler size={18} strokeWidth={1.75} />}>
                  Record measurements
                </Item>
                <Item value="create new order" onSelect={() => go("/orders/new")} icon={<ClipboardList size={18} strokeWidth={1.75} />}>
                  New order
                </Item>
              </Group>

              <Group heading="Go to">
                <Item value="today dashboard home" onSelect={() => go("/today")} icon={<CalendarDays size={18} strokeWidth={1.75} />}>
                  Today
                </Item>
                <Item value="clients list" onSelect={() => go("/clients")} icon={<Users size={18} strokeWidth={1.75} />}>
                  Clients
                </Item>
                <Item value="orders list" onSelect={() => go("/orders")} icon={<ShoppingBag size={18} strokeWidth={1.75} />}>
                  Orders
                </Item>
                <Item value="settings account preferences" onSelect={() => go("/settings")} icon={<Settings size={18} strokeWidth={1.75} />}>
                  Settings
                </Item>
              </Group>
            </Command.List>
          </Command>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-overline [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-text-tertiary"
    >
      {children}
    </Command.Group>
  );
}

function Item({
  children,
  icon,
  meta,
  value,
  onSelect,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  value: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-[15px] text-ink transition-colors data-[selected=true]:bg-beige-light"
    >
      {icon && <span className="flex size-8 shrink-0 items-center justify-center text-text-secondary">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {meta && <span className="shrink-0 text-caption text-text-tertiary">{meta}</span>}
    </Command.Item>
  );
}

/** ⌘K / Ctrl+K toggles the palette. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
