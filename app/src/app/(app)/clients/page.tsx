"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Plus, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, ClientListSkeleton } from "@/components/ui/states";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { customerRepo, measurementRepo } from "@/lib/mock/store";
import type { Customer, MeasurementSet } from "@/types";
import { toast } from "sonner";

function timeAgo(dateStr: string) {
  const d = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(d / 86400000);
  if (days < 1) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

function ClientsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [clients, setClients] = React.useState<Customer[]>([]);
  const [latestMeasurements, setLatestMeasurements] = React.useState<Record<string, MeasurementSet | null>>({});
  const [search, setSearch] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  // Add client form
  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [newNotes, setNewNotes] = React.useState("");
  const [dupWarning, setDupWarning] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    loadClients();
  }, []);

  React.useEffect(() => {
    if (searchParams.get("add") === "true") {
      setAddOpen(true);
    }
  }, [searchParams]);

  async function loadClients() {
    setLoading(true);
    const all = await customerRepo.list();
    setClients(all);
    // Load latest measurement for each
    const map: Record<string, MeasurementSet | null> = {};
    for (const c of all) {
      map[c.id] = await measurementRepo.getLatest(c.id);
    }
    setLatestMeasurements(map);
    setLoading(false);
  }

  const filtered = search.trim()
    ? clients.filter(c => {
        const q = search.toLowerCase();
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phones.some(p => p.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
        );
      })
    : clients;

  // Group by first letter
  const grouped: Record<string, Customer[]> = {};
  filtered.forEach(c => {
    const letter = c.fullName.charAt(0).toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(c);
  });
  const letters = Object.keys(grouped).sort();

  async function checkPhone(phone: string) {
    if (phone.length > 5) {
      const dup = await customerRepo.checkDuplicatePhone(phone);
      setDupWarning(dup);
    } else {
      setDupWarning(false);
    }
  }

  async function handleAddClient() {
    if (!newName.trim()) return;
    setSaving(true);
    const customer = await customerRepo.create({
      fullName: newName.trim(),
      phones: newPhone.trim() ? [newPhone.trim()] : [],
      email: newEmail.trim() || undefined,
      notes: newNotes.trim() || undefined,
      tags: [],
    });
    toast("Client added");
    setAddOpen(false);
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewNotes("");
    setSaving(false);
    await loadClients();
    router.push(`/clients/${customer.id}`);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header — fixed on scroll */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm px-4 lg:px-8 pt-safe">
        <div className="flex items-center justify-between pt-6 pb-4">
          <h1 className="font-serif text-2xl text-text-primary">Clients</h1>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={16} strokeWidth={2} />
            Add client
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or notes..."
            className="w-full h-11 pl-10 pr-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-cream"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ClientListSkeleton count={8} />
      ) : filtered.length === 0 ? (
        search ? (
          <div className="py-16 text-center">
            <p className="text-sm text-text-secondary mb-4">No clients match &ldquo;{search}&rdquo;</p>
            <Button variant="primary" size="sm" onClick={() => { setSearch(""); setAddOpen(true); setNewName(search); }}>
              <Plus size={16} />
              Add &ldquo;{search}&rdquo; as a client
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={<Users size={24} />}
            title="Your client list is empty"
            description="Add your first client and their measurements to start building your Tayylo workspace."
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} />
                Add client
              </Button>
            }
          />
        )
      ) : (
        <div className="relative">
          {/* A-Z index on mobile */}
          <div className="fixed right-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 pr-1 lg:hidden">
            {letters.map(l => (
              <a
                key={l}
                href={`#letter-${l}`}
                className="text-[10px] font-semibold text-olive w-4 h-4 flex items-center justify-center"
              >
                {l}
              </a>
            ))}
          </div>

          {letters.map(letter => (
            <div key={letter} id={`letter-${letter}`}>
              <div className="px-4 lg:px-8 py-1.5 bg-cream/90 backdrop-blur-sm sticky top-0 z-10">
                <span className="text-xs font-semibold text-text-tertiary uppercase">{letter}</span>
              </div>
              {grouped[letter].map(c => {
                const latest = latestMeasurements[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="flex items-center gap-3.5 w-full px-4 lg:px-8 py-3.5 border-b border-border hover:bg-beige-light/50 transition-colors text-left group"
                  >
                    <Avatar name={c.fullName} src={c.photoUrl} size="md" className="ring-1 ring-border group-hover:ring-olive/40" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-text-primary truncate">{c.fullName}</p>
                        {c.tags.includes("VIP") && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-olive/10 text-olive">
                            VIP
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-text-secondary truncate">{c.phones[0] || "No phone"}</p>
                        {c.media && c.media.length > 0 && (
                          <span className="text-[10px] text-text-tertiary">
                            · {c.media.length} bespoke {c.media.length === 1 ? "piece" : "pieces"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-tertiary whitespace-nowrap shrink-0">
                      {latest
                        ? `Measured ${timeAgo(latest.takenAt)}`
                        : "Not measured"}
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary shrink-0 group-hover:text-olive group-hover:translate-x-0.5 transition-all">
                      <polyline points="6 4 10 8 6 12" />
                    </svg>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Add Client Sheet */}
      <BottomSheet open={addOpen} onOpenChange={setAddOpen} title="Add client">
        <div className="space-y-4 pb-8">
          <Input
            label="Full name"
            placeholder="Enter client name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            autoFocus
          />
          <div>
            <Input
              label="Phone"
              placeholder="+234 800 000 0000"
              type="tel"
              value={newPhone}
              onChange={e => {
                setNewPhone(e.target.value);
                checkPhone(e.target.value);
              }}
              warning={dupWarning ? "A client with this phone number already exists" : undefined}
            />
          </div>
          <Input
            label="Email"
            placeholder="client@example.com"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            helperText="Optional — for sending receipts"
          />
          <Input
            label="Notes"
            placeholder="Preferences, allergies, referrals..."
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
          />

          <Button
            variant="primary"
            className="w-full h-12"
            disabled={!newName.trim() || saving}
            onClick={handleAddClient}
          >
            {saving ? "Adding..." : "Add client"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense>
      <ClientsPageInner />
    </Suspense>
  );
}
