"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { House, Users, Plus, ShoppingBag, Settings, Search, Compass, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

export const TAILOR_NAV: NavItem[] = [
  { key: "today", label: "Home", href: "/today", icon: House },
  { key: "clients", label: "Clients", href: "/clients", icon: Users },
  { key: "orders", label: "Orders", href: "/orders", icon: ShoppingBag },
  { key: "explore", label: "Explore", href: "/explore", icon: Compass },
  { key: "settings", label: "Settings", href: "/settings", icon: Settings },
];

/** Customers only get inspiration and their account — no business tools. */
export const CUSTOMER_NAV: NavItem[] = [
  { key: "explore", label: "Explore", href: "/explore", icon: Compass },
  { key: "account", label: "Account", href: "/account", icon: UserRound },
];

export const NAV_ITEMS = TAILOR_NAV;

export function activeNavKey(pathname: string) {
  return [...TAILOR_NAV, ...CUSTOMER_NAV].find(i => pathname === i.href || pathname.startsWith(i.href + "/"))?.key;
}

// ---------------------------------------------------------- Mobile: floating bar

interface FloatingNavProps {
  active?: string;
  /** Omit for roles that can't create (customers): the bar becomes a plain tab bar. */
  onCreate?: () => void;
  items?: NavItem[];
}

/**
 * Floating, rounded tab bar with a raised centre action. Sits above the
 * home indicator using the safe-area inset; content reserves `pb-nav`.
 */
// Explore sits in the top bar for tailors (and the sidebar on desktop), keeping the tab bar light.
const TAILOR_TABS = TAILOR_NAV.filter(i => i.key !== "explore");

export function FloatingNav({ active, onCreate, items = TAILOR_TABS }: FloatingNavProps) {
  const left = onCreate ? items.slice(0, 2) : items;
  const right = onCreate ? items.slice(2) : [];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden pointer-events-none print:hidden"
    >
      <div className="pointer-events-auto relative mx-auto flex h-[68px] max-w-md items-center rounded-full border border-border/80 bg-surface-raised/95 px-2 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {left.map(item => (
          <TabButton key={item.key} item={item} active={active === item.key} />
        ))}

        {onCreate && (
        <div className="flex w-[72px] shrink-0 justify-center">
          <motion.button
            type="button"
            onClick={onCreate}
            whileTap={{ scale: 0.92 }}
            aria-label="Create: add client, record measurements or new order"
            className="-mt-7 flex size-14 items-center justify-center rounded-full bg-olive text-text-inverse shadow-[var(--shadow-fab)] ring-4 ring-canvas transition-colors hover:bg-olive-deep"
          >
            <Plus size={26} strokeWidth={2} />
          </motion.button>
        </div>
        )}

        {right.map(item => (
          <TabButton key={item.key} item={item} active={active === item.key} />
        ))}
      </div>
    </nav>
  );
}

function TabButton({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-full",
        "transition-colors duration-[var(--duration-fast)]",
        active ? "text-ink" : "text-text-tertiary hover:text-text-secondary"
      )}
    >
      <Icon size={22} strokeWidth={active ? 2 : 1.75} />
      <span className={cn("text-[10.5px] leading-none", active ? "font-semibold" : "font-medium")}>{item.label}</span>
      {active && (
        <motion.span
          layoutId="nav-active-dot"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
          className="absolute bottom-1.5 size-1 rounded-full bg-olive"
        />
      )}
    </Link>
  );
}

// ---------------------------------------------------------- Desktop: sidebar

interface SidebarProps {
  active?: string;
  onCreate?: () => void;
  onSearch?: () => void;
  items?: NavItem[];
  businessName?: string;
  ownerName?: string;
}

export function Sidebar({ active, onCreate, onSearch, items = TAILOR_NAV, businessName, ownerName }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/70 bg-surface lg:flex print:hidden">
      <div className="px-6 pt-7 pb-6">
        <Link href="/today" aria-label="Tayylo home">
          <Logo height={26} priority />
        </Link>
      </div>

      <div className="space-y-2 px-4">
        {onCreate && (
        <Button block onClick={onCreate} className="justify-start pl-4">
          <Plus />
          Create
        </Button>
        )}
        {onSearch && (
        <button
          type="button"
          onClick={onSearch}
          className="flex h-11 w-full items-center gap-2.5 rounded-full bg-surface-sunken px-4 text-label text-text-tertiary transition-colors hover:text-ink"
        >
          <Search size={18} strokeWidth={1.75} />
          <span>Search</span>
          <kbd className="ml-auto rounded-[var(--radius-xs)] bg-surface-raised px-1.5 py-0.5 text-[11px] font-semibold">⌘K</kbd>
        </button>
        )}
      </div>

      <nav aria-label="Main" className="mt-6 flex-1 space-y-1 px-4">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors duration-[var(--duration-fast)]",
                isActive ? "font-semibold text-ink" : "font-medium text-text-secondary hover:bg-beige-light/70 hover:text-ink"
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  className="absolute inset-0 -z-0 rounded-full bg-surface-sunken"
                />
              )}
              <Icon size={20} strokeWidth={isActive ? 2 : 1.75} className="relative" />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {businessName && (
        <Link
          href="/settings"
          className="m-4 flex items-center gap-3 rounded-[var(--radius-card)] p-3 transition-colors hover:bg-beige-light/70"
        >
          <Avatar name={businessName} size="md" />
          <div className="min-w-0">
            <p className="truncate text-label font-semibold text-ink">{businessName}</p>
            {ownerName && <p className="truncate text-caption text-text-tertiary">{ownerName}</p>}
          </div>
        </Link>
      )}
    </aside>
  );
}
