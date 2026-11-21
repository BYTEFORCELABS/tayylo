"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users, UserPlus, Search, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/choice";
import { cn } from "@/lib/utils";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { Tag } from "@/components/ui/tag";
import { AddClientSheet } from "@/components/add-client-sheet";
import { useCustomers, prefetchClient } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import type { Customer } from "@/types";

function ClientsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientsQ = useCustomers();
  const clients = React.useMemo(() => clientsQ.data ?? [], [clientsQ.data]);
  const status: "loading" | "ready" | "error" = clientsQ.data ? "ready" : clientsQ.status;
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);
  const [prefillName, setPrefillName] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const recents = React.useMemo(
    () => [...clients].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 10),
    [clients]
  );

  // `?add=true` (from quick actions / search) opens the sheet directly.
  const addFromUrl = searchParams.get("add") === "true";
  const sheetOpen = addOpen || addFromUrl;


  const q = search.trim().toLowerCase();
  const filtered = q
    ? clients.filter(
        c =>
          c.fullName.toLowerCase().includes(q) ||
          c.phones.some(p => p.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) ||
          c.email?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q) ||
          c.tags.some(t => t.toLowerCase().includes(q))
      )
    : clients;

  const grouped = React.useMemo(() => {
    const map: Record<string, Customer[]> = {};
    [...filtered]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .forEach(c => {
        const ch = c.fullName.charAt(0).toUpperCase();
        const letter = /[A-Z]/.test(ch) ? ch : "#";
        (map[letter] ||= []).push(c);
      });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Clients"
        description={status === "ready" && clients.length > 0 ? `${clients.length} ${clients.length === 1 ? "client" : "clients"}` : undefined}
        actions={
          <>
            {clients.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search clients"
                aria-pressed={searchOpen}
                onClick={() => setSearchOpen(o => !o)}
                className="lg:hidden"
              >
                <Search />
              </Button>
            )}
            <Button onClick={() => setAddOpen(true)} size="md">
              <Plus />
              Add client
            </Button>
          </>
        }
      >
        {clients.length > 0 && (
          <SearchField
            value={search}
            onValueChange={setSearch}
            placeholder="Search name, phone, tag or note"
            className={cn("pb-4", !searchOpen && "max-lg:hidden")}
            autoFocus={searchOpen}
          />
        )}
      </PageHeader>

      <PageBody>
        {status === "loading" ? (
          <ListSkeleton count={8} />
        ) : status === "error" ? (
          <ErrorState title="Couldn't load clients" onRetry={() => clientsQ.refetch()} />
        ) : clients.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="Your client book is empty"
            description="Add a client to start keeping their measurements, orders and fittings in one place."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <UserPlus />
                Add your first client
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={`No clients match “${search}”`}
            description="Try part of their name or phone number."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setPrefillName(search);
                  setAddOpen(true);
                }}
              >
                <UserPlus />
                Add “{search}”
              </Button>
            }
          />
        ) : (
          <>
            {/* Recents — the clients you've worked with lately */}
            {!q && recents.length > 1 && (
              <section aria-label="Recent clients" className="mb-6">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="text-[16px] font-medium text-text-secondary">Recents</h2>
                  <ChevronRight size={18} strokeWidth={1.75} className="text-text-tertiary" aria-hidden />
                </div>
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
                  {recents.map(c => {
                    const [first, ...rest] = c.fullName.split(" ");
                    return (
                      <Link
                        key={c.id}
                        href={`/clients/${c.id}`}
                        onMouseEnter={() => prefetchClient(c.id)}
                        className="flex w-[64px] shrink-0 flex-col items-center gap-2 text-center"
                      >
                        <Avatar name={c.fullName} src={c.photoUrl} size="lg" shape="rounded" className="size-16 text-[20px] font-medium" />
                        <span className="w-full text-[12.5px] font-medium leading-tight text-text-secondary">
                          <span className="block truncate">{first}</span>
                          {rest.length > 0 && <span className="block truncate">{rest.join(" ")}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            <div className="space-y-5">
              {grouped.map(([letter, list]) => (
                <section key={letter} aria-label={letter}>
                  <h2 className="px-1 pb-1 text-[14px] font-medium text-text-secondary">{letter}</h2>
                  <ul>
                    {list.map(c => {
                      const measuredAt = c.lastMeasuredAt;
                      return (
                        <li key={c.id}>
                          <Link
                            href={`/clients/${c.id}`}
                            onMouseEnter={() => prefetchClient(c.id)}
                            onTouchStart={() => prefetchClient(c.id)}
                            className="flex items-center gap-3.5 rounded-[var(--radius-card)] px-1 py-2.5 transition-colors hover:bg-surface/70 active:bg-surface"
                          >
                            <Avatar name={c.fullName} src={c.photoUrl} size="md" shape="rounded" className="size-11" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[15.5px] font-medium text-ink">{c.fullName}</span>
                                {c.tags.slice(0, 1).map(t => (
                                  <Tag key={t} size="sm" variant="olive" className="max-sm:hidden">
                                    {t}
                                  </Tag>
                                ))}
                              </span>
                              <span className="block truncate text-[13px] text-text-secondary">
                                {c.phones[0] || c.email || "No contact details"}
                              </span>
                            </span>
                            <span className="shrink-0 text-[11.5px] text-text-tertiary">
                              {measuredAt ? `Measured ${timeAgo(measuredAt)}` : "Not measured"}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </PageBody>

      <AddClientSheet
        open={sheetOpen}
        onOpenChange={open => {
          setAddOpen(open);
          if (!open) {
            setPrefillName("");
            if (addFromUrl) router.replace("/clients");
          }
        }}
        initialName={prefillName}
        onCreated={customer => {
          toast.success(`${customer.fullName} added`);
          router.push(`/clients/${customer.id}`);
        }}
      />
    </>
  );
}

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsPageInner />
    </Suspense>
  );
}
