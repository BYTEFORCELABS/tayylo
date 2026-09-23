"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import { customerRepo, orderRepo } from "@/lib/mock/store";
import type { Customer, Order } from "@/types";
import {
  Search, Users, ShoppingBag, Ruler, Plus, Settings, CalendarDays, UserPlus, ClipboardList,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [clients, setClients] = React.useState<Customer[]>([]);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      customerRepo.list().then(setClients);
      orderRepo.list().then(setOrders);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const navigate = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      {/* Command panel */}
      <div className="fixed left-1/2 top-[12%] -translate-x-1/2 w-full max-w-lg z-[61] px-4">
        <Command
          className="bg-white-warm rounded-[var(--radius-card)] border border-border shadow-[var(--shadow-dialog)] overflow-hidden animate-in fade-in-0 zoom-in-95"
          label="Search Tayylo"
        >
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <Search size={18} className="text-text-tertiary shrink-0" strokeWidth={1.5} />
            <Command.Input
              ref={inputRef}
              placeholder="Search clients, orders, or commands..."
              className="flex-1 h-12 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center px-1.5 rounded bg-beige-light text-[10px] font-medium text-text-tertiary">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-text-secondary">
              No results found.
            </Command.Empty>

            {/* Quick actions */}
            <Command.Group heading="Actions" className="px-2 py-1">
              <CommandItem onSelect={() => navigate("/clients?add=true")} icon={<UserPlus size={16} />}>
                Add new client
              </CommandItem>
              <CommandItem onSelect={() => navigate("/clients")} icon={<Ruler size={16} />}>
                Record measurements
              </CommandItem>
              <CommandItem onSelect={() => navigate("/orders?add=true")} icon={<ClipboardList size={16} />}>
                Create new order
              </CommandItem>
            </Command.Group>

            {/* Pages */}
            <Command.Group heading="Navigate" className="px-2 py-1">
              <CommandItem onSelect={() => navigate("/today")} icon={<CalendarDays size={16} />}>
                Today
              </CommandItem>
              <CommandItem onSelect={() => navigate("/clients")} icon={<Users size={16} />}>
                Clients
              </CommandItem>
              <CommandItem onSelect={() => navigate("/orders")} icon={<ShoppingBag size={16} />}>
                Orders
              </CommandItem>
              <CommandItem onSelect={() => navigate("/settings")} icon={<Settings size={16} />}>
                Settings
              </CommandItem>
            </Command.Group>

            {/* Clients */}
            {clients.length > 0 && (
              <Command.Group heading="Clients" className="px-2 py-1">
                {clients.slice(0, 8).map(c => (
                  <CommandItem
                    key={c.id}
                    onSelect={() => navigate(`/clients/${c.id}`)}
                    icon={<Avatar name={c.fullName} size="sm" />}
                    meta={c.phones[0]}
                  >
                    {c.fullName}
                  </CommandItem>
                ))}
              </Command.Group>
            )}

            {/* Orders */}
            {orders.length > 0 && (
              <Command.Group heading="Orders" className="px-2 py-1">
                {orders.filter(o => !["delivered", "cancelled"].includes(o.statusName)).slice(0, 5).map(o => (
                  <CommandItem
                    key={o.id}
                    onSelect={() => navigate(`/orders/${o.id}`)}
                    icon={<ShoppingBag size={16} />}
                    meta={o.statusName}
                  >
                    #{o.number} · {o.customerName}
                  </CommandItem>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

function CommandItem({
  children,
  icon,
  meta,
  onSelect,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-button)] text-sm text-text-primary cursor-pointer transition-colors data-[selected=true]:bg-beige-light hover:bg-beige-light/50"
    >
      {icon && (
        <span className="text-text-tertiary shrink-0">{icon}</span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {meta && (
        <span className="text-xs text-text-tertiary shrink-0">{meta}</span>
      )}
    </Command.Item>
  );
}

// Hook for ⌘K
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
