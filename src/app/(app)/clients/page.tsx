"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/choice";
import { List, ListItem } from "@/components/ui/list";
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
          <Button onClick={() => setAddOpen(true)} size="md">
            <Plus />
            <span className="max-sm:sr-only">Add client</span>
          </Button>
        }
      >
        {clients.length > 0 && (
          <SearchField
            value={search}
            onValueChange={setSearch}
            placeholder="Search name, phone, tag or note"
            className="pb-4"
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
          <div className="space-y-6">
            {grouped.map(([letter, list]) => (
              <section key={letter} aria-label={letter}>
                <h2 className="mb-2 px-1 text-overline uppercase text-text-tertiary">{letter}</h2>
                <List>
                  {list.map(c => {
                    const measuredAt = c.lastMeasuredAt;
                    return (
                      <ListItem
                        key={c.id}
                        href={`/clients/${c.id}`}
                        onPrefetch={() => prefetchClient(c.id)}
                        leading={<Avatar name={c.fullName} src={c.photoUrl} />}
                        title={
                          <span className="flex items-center gap-2">
                            <span className="truncate">{c.fullName}</span>
                            {c.tags.slice(0, 1).map(t => (
                              <Tag key={t} size="sm" variant="olive">
                                {t}
                              </Tag>
                            ))}
                          </span>
                        }
                        subtitle={c.phones[0] || c.email || "No contact details"}
                        trailingSub={
                          measuredAt ? `Measured ${timeAgo(measuredAt)}` : "Not measured"
                        }
                        chevron
                      />
                    );
                  })}
                </List>
              </section>
            ))}
          </div>
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
