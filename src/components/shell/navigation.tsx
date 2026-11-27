"use client";

import React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { House, Users, Plus, ShoppingBag, Settings, Search, Compass, UserRound, IdCard, ShoppingCart, CircleUserRound, type LucideIcon } from "lucide-react";
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

/** Phone tab bar wording and icons (the desktop sidebar keeps the full names). */
const MOBILE_TAB: Record<string, { label: string; icon: LucideIcon }> = {
  today: { label: "Home", icon: House },
  clients: { label: "Contact", icon: IdCard },
  orders: { label: "Orders", icon: ShoppingCart },
  settings: { label: "Profile", icon: CircleUserRound },
};

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

  // The bar is cut away in a smooth groove around the raised centre button.
  // Shadow comes from a drop-shadow filter on the wrapper so it follows the cut-out.
  const groove = "radial-gradient(circle 41px at 50% 4px, transparent 40px, #000 41px)";

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden pointer-events-none print:hidden"
    >
      <div className="relative mx-auto max-w-md drop-shadow-[0_10px_22px_rgba(30,32,25,0.16)]">
        <div
          className="pointer-events-auto flex h-[64px] items-center rounded-full bg-surface-raised px-3"
          style={onCreate ? { WebkitMaskImage: groove, maskImage: groove } : undefined}
        >
          {left.map(item => (
            <TabButton key={item.key} item={item} active={active === item.key} />
          ))}

          {/* Space the centre button sits in */}
          {onCreate && <div className="w-[84px] shrink-0" aria-hidden />}

          {right.map(item => (
            <TabButton key={item.key} item={item} active={active === item.key} />
          ))}
        </div>

        {onCreate && (
          <motion.button
            type="button"
            onClick={onCreate}
            whileTap={{ scale: 0.92 }}
            aria-label="Create: add client, record measurements or new order"
            className="fab-raised pointer-events-auto absolute left-1/2 top-[4px] flex size-[64px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-olive text-text-inverse transition-colors hover:bg-olive-deep"
          >
            <Plus size={28} strokeWidth={2.25} />
          </motion.button>
        )}
      </div>
    </nav>
  );
}

function TabButton({ item, active }: { item: NavItem; active: boolean }) {
  const tab = MOBILE_TAB[item.key];
  const Icon = tab?.icon ?? item.icon;
  const label = tab?.label ?? item.label;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={cn(
        "relative flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-full",
        "transition-colors duration-[var(--duration-fast)]",
        active ? "!text-[#3F8A2A]" : "!text-text-secondary hover:!text-ink"
      )}
    >
      {/* The selected tab turns green, on a soft green pill, so it's obvious where you are */}
      <span className="relative flex h-8 w-14 items-center justify-center">
        {active && (
          <motion.span
            layoutId="nav-active-pill"
            transition={{ type: "spring", stiffness: 500, damping: 36 }}
            className="absolute inset-0 rounded-full bg-[#3F8A2A]/12"
          />
        )}
        <Icon size={23} strokeWidth={active ? 2.1 : 1.6} className="relative" />
      </span>
      {/* Only the current tab is labelled, like the design */}
      {active && (
        <motion.span
          layoutId="nav-active-label"
          initial={{ opacity: 0, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
          className="text-[11px] font-semibold leading-none"
        >
          {label}
        </motion.span>
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
                isActive ? "font-semibold !text-ink" : "font-medium !text-text-secondary hover:bg-beige-light/70 hover:!text-ink"
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
