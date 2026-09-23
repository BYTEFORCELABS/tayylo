"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  CalendarDays, Users, Plus, ShoppingBag, MoreHorizontal,
  Ruler, UserPlus, ClipboardList, Settings, FileUp, FileDown, Palette,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { CommandPalette, useCommandPalette } from "@/components/ui/command-palette";

const tabs = [
  { key: "today", label: "Today", icon: CalendarDays, href: "/today" },
  { key: "clients", label: "Clients", icon: Users, href: "/clients" },
  { key: "add", label: "Add", icon: Plus, href: "#" },
  { key: "orders", label: "Orders", icon: ShoppingBag, href: "/orders" },
  { key: "more", label: "More", icon: MoreHorizontal, href: "/settings" },
];

const sidebarItems = [
  { key: "today", label: "Today", icon: CalendarDays, href: "/today" },
  { key: "clients", label: "Clients", icon: Users, href: "/clients" },
  { key: "orders", label: "Orders", icon: ShoppingBag, href: "/orders" },
];

const sidebarBottom = [
  { key: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();

  const activeTab = tabs.find(t => t.href !== "#" && pathname.startsWith(t.href))?.key || "today";

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.key === "add") {
      setSheetOpen(true);
    } else {
      router.push(tab.href);
    }
  };

  return (
    <div className="min-h-[100dvh] flex bg-cream">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-olive-deep text-white-warm shrink-0 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center gap-3 px-5 py-6">
          <Image src="/lockup_cream.png" alt="Tayylo" width={120} height={30} />
        </div>

        {/* Search */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-2 w-full h-9 px-3 rounded-[var(--radius-button)] bg-white/10 text-beige/60 text-sm hover:bg-white/15 transition-colors"
          >
            <Search size={16} strokeWidth={1.5} />
            <span>Search</span>
            <span className="ml-auto text-xs opacity-50">⌘K</span>
          </button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {sidebarItems.map(item => (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium transition-colors",
                activeTab === item.key
                  ? "bg-white/15 text-white-warm"
                  : "text-beige/70 hover:bg-white/10 hover:text-white-warm"
              )}
            >
              <item.icon size={20} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}

          {/* Add button */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium text-beige/70 hover:bg-white/10 hover:text-white-warm transition-colors mt-4"
          >
            <div className="w-5 h-5 rounded bg-dark-olive flex items-center justify-center">
              <Plus size={14} strokeWidth={2} />
            </div>
            Quick add
          </button>
        </nav>

        <div className="px-3 pb-4 space-y-1">
          {sidebarBottom.map(item => (
            <button
              key={item.key}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-button)] text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-white/15 text-white-warm"
                  : "text-beige/70 hover:bg-white/10 hover:text-white-warm"
              )}
            >
              <item.icon size={20} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-60 min-h-[100dvh] pb-20 lg:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white-warm border-t border-border pb-safe">
        <div className="flex items-center justify-around h-16">
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            const isAdd = tab.key === "add";

            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 h-full px-3 transition-colors",
                  isAdd ? "" : isActive ? "text-olive" : "text-text-tertiary"
                )}
                aria-label={tab.label}
              >
                {isAdd ? (
                  <div className="w-11 h-11 -mt-4 rounded-full bg-olive text-white-warm flex items-center justify-center shadow-sm active:scale-[0.95] transition-transform">
                    <Plus size={22} strokeWidth={2} />
                  </div>
                ) : (
                  <>
                    <tab.icon size={22} strokeWidth={1.5} />
                    <span className="text-[10px] font-medium">{tab.label}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Quick add bottom sheet */}
      <BottomSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Quick actions"
      >
        <div className="space-y-1 pb-6">
          {[
            { icon: <UserPlus size={20} />, label: "Add client", desc: "Add a new client", href: "/clients?add=true" },
            { icon: <Ruler size={20} />, label: "Record measurements", desc: "Measure a client", href: "/clients" },
            { icon: <ClipboardList size={20} />, label: "New order", desc: "Create a new order", href: "/orders/new" },
          ].map(item => (
            <button
              key={item.label}
              className="flex items-center gap-4 w-full px-3 py-3 rounded-[var(--radius-button)] hover:bg-beige-light transition-colors text-left"
              onClick={() => {
                setSheetOpen(false);
                router.push(item.href);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-beige-light flex items-center justify-center text-olive">
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* Command palette */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
