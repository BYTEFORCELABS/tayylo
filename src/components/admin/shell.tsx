"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  TrendingUp,
  SlidersHorizontal,
  UserCog,
  ScrollText,
  CreditCard,
  Megaphone,
  Ruler,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface Item {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function AdminShell({
  staff,
  openReports,
  children,
}: {
  staff: { email: string; name: string | null; staffRole: string; isSuper: boolean };
  openReports: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  // Close the phone menu after navigating (adjusting state during render).
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const items: Item[] = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/users", label: "Users", icon: Users },
    { href: "/moderation", label: "Moderation", icon: ShieldAlert, badge: openReports },
    { href: "/insights", label: "Top performing", icon: TrendingUp },
    { href: "/subscriptions", label: "Subscriptions", icon: CreditCard },
    { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    { href: "/templates", label: "Templates", icon: Ruler },
    { href: "/settings", label: "App controls", icon: SlidersHorizontal },
    ...(staff.staffRole === "owner" ? [{ href: "/team", label: "Team", icon: UserCog }] : []),
    { href: "/audit", label: "Audit log", icon: ScrollText },
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));

  const nav = (
    <nav aria-label="Admin" className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-full px-4 text-[14px] font-semibold transition-colors",
            isActive(href) ? "bg-olive !text-text-inverse" : "!text-text-secondary hover:bg-surface-sunken hover:!text-ink"
          )}
        >
          <Icon size={18} strokeWidth={1.75} aria-hidden />
          <span className="flex-1">{label}</span>
          {!!badge && (
            <span
              className={cn(
                "min-w-6 rounded-full px-2 py-0.5 text-center text-[11px] font-bold tabular",
                isActive(href) ? "bg-white/20 text-text-inverse" : "bg-danger-bg text-danger"
              )}
              aria-label={`${badge} to review`}
            >
              {badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="border-t border-divider pt-4">
      <p className="truncate text-label font-semibold text-ink">{staff.name || staff.email}</p>
      <p className="truncate text-caption text-text-tertiary">
        {staff.email} · <span className="capitalize">{staff.isSuper ? "Super admin" : staff.staffRole}</span>
      </p>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-3 flex items-center gap-2 text-label font-semibold text-text-secondary hover:text-ink"
      >
        <LogOut size={16} strokeWidth={1.75} aria-hidden /> Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-border/70 bg-surface p-5 lg:flex">
        <Brand />
        {nav}
        {footer}
      </aside>

      {/* Phone / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex size-10 items-center justify-center rounded-full hover:bg-surface-sunken"
          aria-label="Open menu"
        >
          <Menu size={20} strokeWidth={1.75} />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-surface p-5 shadow-[var(--shadow-dialog)] animate-fade-in">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-10 items-center justify-center rounded-full hover:bg-surface-sunken"
                aria-label="Close menu"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Logo height={22} />
      <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-text-inverse">Admin</span>
    </Link>
  );
}
