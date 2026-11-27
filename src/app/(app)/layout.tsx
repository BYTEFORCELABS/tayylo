"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { UserPlus, Ruler, ClipboardList, ChevronRight } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconTile } from "@/components/ui/list";
import { CommandPalette, useCommandPalette } from "@/components/ui/command-palette";
import { OfflineBanner, ErrorState } from "@/components/ui/states";
import { BrandLoader } from "@/components/brand/brand-loader";
import { FloatingNav, Sidebar, activeNavKey, CUSTOMER_NAV } from "@/components/shell/navigation";
import { ShellContext } from "@/components/shell/shell-context";
import { useBusiness, useMe } from "@/lib/use-business";
import { ApiRequestError } from "@/lib/data/store";
import { prefetchWorkspace } from "@/lib/queries";
import { AnnouncementBanner, MaintenanceScreen, useAppConfig } from "@/components/app-status";

const QUICK_ACTIONS = [
  {
    icon: <Ruler />,
    label: "Record measurements",
    desc: "Take a client's measurements with the tape keypad",
    href: "/measure",
  },
  {
    icon: <ClipboardList />,
    label: "New order",
    desc: "Start a garment order with price and due date",
    href: "/orders/new",
  },
  {
    icon: <UserPlus />,
    label: "Add client",
    desc: "Save a new client's contact details",
    href: "/clients?add=true",
  },
];

/** Focused task flows hide the tab bar so it never covers the keypad or forms. */
function isTaskRoute(pathname: string) {
  return (
    pathname.startsWith("/measure") ||
    pathname.startsWith("/orders/new") ||
    /^\/clients\/[^/]+\/edit/.test(pathname) ||
    /^\/orders\/[^/]+\/(invoice|receipt)/.test(pathname)
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // No separate session round-trip: the business request itself tells us
  // whether the user is signed in (401) or still needs onboarding (null).
  // Orders and clients start loading in parallel with it.
  const { business, status, error, refresh } = useBusiness();
  const { role, error: meError } = useMe();
  const customer = role === "customer";
  const customerHome = pathname.startsWith("/explore") || pathname.startsWith("/account");
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandPalette();
  const appConfig = useAppConfig();
  const signedOut =
    (error instanceof ApiRequestError && error.status === 401) ||
    (meError instanceof ApiRequestError && meError.status === 401);

  React.useEffect(() => {
    if (role === "tailor") prefetchWorkspace();
  }, [role]);

  // Once the workspace is open, load the code for the main tabs and create
  // flows in the background so switching to them never waits on the network.
  React.useEffect(() => {
    if (!business || role !== "tailor") return;
    const warm = () =>
      ["/today", "/clients", "/orders", "/settings", "/measure", "/orders/new"].forEach(r => router.prefetch(r));
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(warm);
    else setTimeout(warm, 300);
  }, [business, role, router]);

  React.useEffect(() => {
    if (signedOut) router.replace("/welcome");
    else if (customer) {
      // Customers never see tailor tools: keep them on Explore / Account.
      if (!customerHome) router.replace("/explore");
    } else if (role === "tailor" && status === "ready" && !business) router.replace("/onboarding");
  }, [signedOut, status, business, router, customer, customerHome, role]);

  const shell = React.useMemo(
    () => ({ openSearch: () => setSearchOpen(true), openQuickAdd: () => setSheetOpen(true), hasSidebar: true }),
    [setSearchOpen]
  );

  // Set from the admin portal: the API is refusing requests anyway.
  if (appConfig?.maintenance) return <MaintenanceScreen message={appConfig.maintenance.message} />;
  const banner = appConfig?.announcement ? <AnnouncementBanner announcement={appConfig.announcement} /> : null;

  if (status === "error" && !signedOut && !customer) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
        <ErrorState
          title="Couldn't open your workspace"
          description="We couldn't reach Tayylo. Check your connection and try again."
          onRetry={() => refresh()}
        />
      </div>
    );
  }

  // Customer workspace: Explore + Account only. No orders, invoices or clients.
  if (customer) {
    if (!customerHome) return <BrandLoader label="Opening Explore" />;
    return (
      <ShellContext.Provider value={shell}>
        <div className="min-h-[100dvh] bg-canvas">
          {banner}
          <Sidebar active={activeNavKey(pathname)} items={CUSTOMER_NAV} />
          <main className="pb-nav lg:pl-64 lg:pb-12 print:p-0">
            <div key={pathname} className="animate-fade-in">
              {children}
            </div>
          </main>
          <FloatingNav active={activeNavKey(pathname)} items={CUSTOMER_NAV} />
          <OfflineBanner />
        </div>
      </ShellContext.Provider>
    );
  }

  if (!business || !role) {
    return <BrandLoader label="Opening your workspace" />;
  }

  const active = activeNavKey(pathname);
  const task = isTaskRoute(pathname);

  return (
    <ShellContext.Provider value={shell}>
      <div className="min-h-[100dvh] bg-canvas">
        {banner}
        <Sidebar
          active={active}
          onCreate={() => setSheetOpen(true)}
          onSearch={() => setSearchOpen(true)}
          businessName={business.name}
          ownerName={business.ownerName}
        />

        <main className={task ? "lg:pl-64 print:p-0" : "pb-nav lg:pl-64 lg:pb-12 print:p-0"}>
          <div key={pathname} className="animate-fade-in">
            {children}
          </div>
        </main>

        {!task && <FloatingNav active={active} onCreate={() => setSheetOpen(true)} />}

        <BottomSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Create">
          <div className="-mx-2 space-y-1">
            {QUICK_ACTIONS.map(item => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center gap-4 rounded-[var(--radius-card)] px-2 py-3 text-left transition-colors hover:bg-beige-light/70 active:bg-beige-light"
                onClick={() => {
                  setSheetOpen(false);
                  router.push(item.href);
                }}
              >
                <IconTile tone="olive" size="lg">
                  {item.icon}
                </IconTile>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink">{item.label}</p>
                  <p className="text-label text-text-tertiary">{item.desc}</p>
                </div>
                <ChevronRight size={18} strokeWidth={1.75} className="text-text-tertiary" />
              </button>
            ))}
          </div>
        </BottomSheet>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
        <OfflineBanner />
      </div>
    </ShellContext.Provider>
  );
}
