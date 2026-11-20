"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { Ruler, Phone, MessageCircle, ClipboardList, Pencil, Scissors, UserX } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { List } from "@/components/ui/list";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState, LoadingRegion, Skeleton, MeasurementGridSkeleton, ListSkeleton } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Card } from "@/components/ui/card";
import { OrderListItem } from "@/components/order-list-item";
import { MeasurementsTab } from "@/components/client/measurements-tab";
import { PhotosTab } from "@/components/client/photos-tab";
import { ShareMeasurementsDialog, whatsappLink } from "@/components/client/share-dialog";
import { customerRepo } from "@/lib/data/store";
import { getQueryData } from "@/lib/query";
import { qk, useCustomer, useMeasurements, useOrdersByCustomer, useTemplates } from "@/lib/queries";
import type { Customer } from "@/types";
import { useBusiness } from "@/lib/use-business";
import { formatDate, formatMoney } from "@/lib/format";
import { balanceMinor, garmentOf, normalizeStatus } from "@/lib/orders";


type Tab = "measurements" | "orders" | "fittings" | "notes" | "photos";

export default function ClientProfilePage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const { business, unit, currency } = useBusiness();

  const clientQ = useCustomer(clientId);
  const measurementsQ = useMeasurements(clientId);
  const ordersQ = useOrdersByCustomer(clientId);
  const templatesQ = useTemplates();
  // Render the client straight away from the cached client list (no photos
  // yet); measurements, orders and photos fill in as they arrive.
  const listCopy = React.useMemo(
    () => getQueryData<Customer[]>(qk.customers)?.find(c => c.id === clientId),
    [clientId]
  );
  const client: Customer | null = clientQ.data !== undefined ? clientQ.data : (listCopy ?? null);
  const status: "loading" | "ready" | "error" =
    client || clientQ.data === null ? "ready" : clientQ.status === "error" ? "error" : "loading";
  const queries = [clientQ, measurementsQ, ordersQ, templatesQ];
  const measurementsLoading = measurementsQ.data === undefined;
  const ordersLoading = ordersQ.data === undefined;
  const measurements = measurementsQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const templates = templatesQ.data ?? [];
  const setClient = clientQ.mutate;

  const [tab, setTab] = React.useState<Tab>("measurements");
  const [shareOpen, setShareOpen] = React.useState(false);
  // Unsaved edits to the notes; null means "showing what's saved".
  const [notesDraft, setNotesDraft] = React.useState<string | null>(null);
  const notes = notesDraft ?? client?.notes ?? "";
  const setNotes = (v: string) => setNotesDraft(v);
  const [savingNotes, setSavingNotes] = React.useState(false);

  if (status === "loading") {
    return (
      <>
        <PageHeader variant="compact" title="" back="/clients" backLabel="Back to clients" />
        <PageBody>
          <LoadingRegion label="Loading client">
            <div className="flex items-center gap-4 py-2">
              <Skeleton variant="circular" width={80} height={80} />
              <div className="flex-1 space-y-2.5">
                <Skeleton width="55%" height={22} />
                <Skeleton width="35%" height={14} />
              </div>
            </div>
            <Skeleton className="mt-6" width="100%" height={44} />
            <div className="mt-6">
              <MeasurementGridSkeleton />
            </div>
          </LoadingRegion>
        </PageBody>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader variant="compact" title="Client" back="/clients" backLabel="Back to clients" />
        <ErrorState title="Couldn't load this client" onRetry={() => queries.forEach(q => q.status === "error" && q.refetch())} />
      </>
    );
  }

  if (!client) {
    return (
      <>
        <PageHeader variant="compact" title="Client" back="/clients" backLabel="Back to clients" />
        <EmptyState
          icon={<UserX />}
          title="Client not found"
          description="They may have been removed, or the link is incorrect."
          action={<Button onClick={() => router.push("/clients")}>Back to clients</Button>}
        />
      </>
    );
  }

  const phone = client.phones[0];
  const current = measurements[0];
  const fittings = orders
    .flatMap(o => o.fittings.map(f => ({ ...f, order: o })))
    .sort((a, b) => +new Date(b.fittedAt) - +new Date(a.fittedAt));
  const totalOwed = orders.filter(o => normalizeStatus(o.statusName) !== "cancelled").reduce((s, o) => s + balanceMinor(o), 0);
  const notesDirty = notes.trim() !== (client.notes ?? "").trim();

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await customerRepo.update(client.id, { notes: notes.trim() });
      setClient({ ...client, notes: notes.trim() });
      setNotesDraft(null);
      toast.success("Notes saved");
    } catch {
      toast.error("Couldn't save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <>
      <PageHeader
        variant="compact"
        title={client.fullName}
        back="/clients"
        backLabel="Back to clients"
        actions={
          <Button variant="secondary" size="icon" aria-label="Edit client" onClick={() => router.push(`/clients/${client.id}/edit`)}>
            <Pencil />
          </Button>
        }
      />

      <PageBody>
        {/* Identity */}
        <div className="flex items-center gap-4 pt-2">
          <Avatar name={client.fullName} src={client.photoUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h2 className="text-title text-ink break-words">{client.fullName}</h2>
            <p className="mt-1 text-label text-text-tertiary">
              {phone || client.email || "No contact details"} · Client since {formatDate(client.createdAt)}
            </p>
            {client.tags.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {client.tags.map(t => (
                  <Tag key={t} size="sm" variant="olive">
                    {t}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Key facts */}
        <dl className="mt-6 grid grid-cols-3 divide-x divide-divider rounded-[var(--radius-card)] border border-border/70 bg-surface py-4">
          <Fact
            label="Last measured"
            value={
              current
                ? formatDate(current.takenAt, { year: false })
                : client.lastMeasuredAt
                  ? formatDate(client.lastMeasuredAt, { year: false })
                  : measurementsLoading
                    ? "…"
                    : "—"
            }
          />
          <Fact label="Orders" value={ordersLoading ? "…" : String(orders.length)} />
          <Fact
            label="Balance"
            value={ordersLoading ? "…" : totalOwed > 0 ? formatMoney(totalOwed, currency) : "Paid up"}
            emphasis={!ordersLoading && totalOwed > 0}
          />
        </dl>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button onClick={() => router.push(`/measure?clientId=${client.id}`)} className="min-w-0 flex-1 px-3 sm:flex-none sm:px-5">
            <Ruler />
            Measure
          </Button>
          <Button variant="secondary" onClick={() => router.push(`/orders/new?clientId=${client.id}`)} className="min-w-0 flex-1 px-3 sm:flex-none sm:px-5">
            <ClipboardList />
            New order
          </Button>
          {phone && (
            <>
              <Button variant="secondary" size="icon" asChild>
                <a href={`tel:${phone}`} aria-label={`Call ${client.fullName}`}>
                  <Phone />
                </a>
              </Button>
              <Button variant="secondary" size="icon" asChild>
                <a
                  href={whatsappLink(phone, `Hello ${client.fullName.split(" ")[0]},`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp ${client.fullName}`}
                >
                  <MessageCircle />
                </a>
              </Button>
            </>
          )}
        </div>

        <Tabs
          className="mt-8"
          ariaLabel="Client sections"
          value={tab}
          onChange={setTab}
          items={[
            { value: "measurements", label: "Measurements", count: measurementsLoading ? undefined : measurements.length },
            { value: "orders", label: "Orders", count: ordersLoading ? undefined : orders.length },
            { value: "fittings", label: "Fittings", count: ordersLoading ? undefined : fittings.length },
            { value: "notes", label: "Notes" },
            { value: "photos", label: "Photos", count: client.media?.length ?? 0 },
          ]}
        />

        <div className="pt-5" role="tabpanel">
          {tab === "measurements" && measurementsLoading && <MeasurementGridSkeleton />}
          {tab === "measurements" && !measurementsLoading && (
            <MeasurementsTab
              clientId={client.id}
              measurements={measurements}
              templates={templates}
              unit={unit}
              onChanged={sets => measurementsQ.mutate(sets)}
              onShare={() => setShareOpen(true)}
            />
          )}

          {(tab === "orders" || tab === "fittings") && ordersLoading && <ListSkeleton count={3} />}
          {tab === "orders" &&
            !ordersLoading &&
            (orders.length === 0 ? (
              <EmptyState
                variant="inset"
                icon={<ClipboardList />}
                title="No orders yet"
                description="Orders for this client, with balances and due dates, will appear here."
                action={
                  <Button onClick={() => router.push(`/orders/new?clientId=${client.id}`)}>
                    <ClipboardList />
                    Create order
                  </Button>
                }
              />
            ) : (
              <List className="animate-fade-in">
                {[...orders]
                  .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
                  .map(o => (
                    <OrderListItem key={o.id} order={o} hideClient />
                  ))}
              </List>
            ))}

          {tab === "fittings" &&
            !ordersLoading &&
            (fittings.length === 0 ? (
              <EmptyState
                variant="inset"
                icon={<Scissors />}
                title="No fittings recorded"
                description="Fittings you log on this client's orders are collected here."
              />
            ) : (
              <ol className="relative space-y-3 animate-fade-in">
                {fittings.map(f => (
                  <li key={f.id}>
                    <Card padding="sm" interactive onClick={() => router.push(`/orders/${f.order.id}`)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-ink">
                            Fitting {f.number} · {garmentOf(f.order)}
                          </p>
                          <p className="text-label text-text-tertiary">
                            {formatDate(f.fittedAt)} · Order #{f.order.number}
                          </p>
                        </div>
                        <Tag size="sm" variant={f.outcome === "approved" ? "success" : "warning"}>
                          {f.outcome === "approved" ? "Approved" : "Adjustments"}
                        </Tag>
                      </div>
                      {f.adjustments.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {f.adjustments.map(a => (
                            <Tag key={a.fieldKey} size="sm" variant="beige" className="tabular">
                              {a.label} {a.rawDelta}
                            </Tag>
                          ))}
                        </div>
                      )}
                      {f.notes && <p className="mt-3 text-label text-text-secondary">{f.notes}</p>}
                    </Card>
                  </li>
                ))}
              </ol>
            ))}

          {tab === "notes" && (
            <div className="animate-fade-in">
              <Textarea
                label="Fit notes and preferences"
                helperText="Posture, preferred ease, fabric sensitivities, referral source — anything you want to remember next visit."
                rows={7}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Right shoulder sits ½ in lower. Prefers a relaxed drape through the chest."
              />
              <div className="mt-4 flex justify-end gap-2">
                {notesDirty && (
                  <Button variant="ghost" onClick={() => setNotesDraft(null)}>
                    Discard
                  </Button>
                )}
                <Button onClick={saveNotes} loading={savingNotes} disabled={!notesDirty}>
                  Save notes
                </Button>
              </div>
            </div>
          )}

          {tab === "photos" && client.media === undefined && <MeasurementGridSkeleton count={4} />}
          {tab === "photos" && client.media !== undefined && (
            <PhotosTab
              clientId={client.id}
              media={client.media ?? []}
              onChange={media => setClient({ ...client, media })}
            />
          )}
        </div>
      </PageBody>

      <ShareMeasurementsDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        clientName={client.fullName}
        phone={phone}
        businessName={business?.name}
        set={current}
        unit={unit}
      />
    </>
  );
}

function Fact({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="min-w-0 px-3 text-center">
      <dt className="text-caption text-text-tertiary">{label}</dt>
      <dd className={`tabular mt-1 truncate text-[15px] font-semibold ${emphasis ? "text-warning" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
