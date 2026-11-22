"use client";

// Printable invoice and receipt for an order, generated from the order's
// own data: garment, services, agreed price and payments. "Print / Save
// PDF" uses the browser's print dialog; the app chrome is hidden in print.

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Share2, FileQuestion, Lock, MessageCircle, Landmark, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/page";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { Logo } from "@/components/brand/logo";
import { BrandMark, bankAccountsOf, invoiceAccount } from "@/components/settings/branding";
import { orderRepo } from "@/lib/data/store";
import { getQueryData } from "@/lib/query";
import { qk, useCustomer, useOrder } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { formatDate, formatMoney } from "@/lib/format";
import { balanceMinor, garmentOf, paidMinor } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { BankAccount, Business, Customer, Order } from "@/types";

export type DocumentKind = "invoice" | "receipt";

export const documentNumber = (kind: DocumentKind, order: Pick<Order, "number">) =>
  `${kind === "invoice" ? "INV" : "RCT"}-${order.number}`;

/** A receipt confirms payment, so it exists once the order is paid in full. */
export const receiptAvailable = (order: Order) => order.priceMinor > 0 && balanceMinor(order) <= 0;

function lastPaymentDate(order: Order) {
  const dates = order.payments.map(p => +new Date(p.paidAt));
  return dates.length ? new Date(Math.max(...dates)) : new Date(order.updatedAt);
}

interface Line {
  description: string;
  detail?: string;
  qty: number;
  amount?: number;
}

function linesFor(order: Order): Line[] {
  const lines: Line[] = order.items.map((item, i) => ({
    description: `${item.garmentType} — tailoring`,
    detail: item.styleNotes || "Cut, sew and finish to the client's measurements",
    qty: 1,
    // Orders carry one agreed price; it sits on the first garment.
    amount: i === 0 ? order.priceMinor : undefined,
  }));
  if (order.fittings.length > 0) {
    lines.push({
      description: "Fittings and alterations",
      detail: `${order.fittings.length} fitting${order.fittings.length > 1 ? "s" : ""} recorded`,
      qty: order.fittings.length,
    });
  }
  return lines;
}

function shareText(kind: DocumentKind, order: Order, business: Business | null) {
  const paid = paidMinor(order);
  const balance = balanceMinor(order);
  const account = kind === "invoice" && balance > 0 ? invoiceAccount(business, order.bankAccountId) : null;
  const money = (m: number) => formatMoney(m, order.currency);
  const lines = [
    `*${business?.name || "Tayylo"}*`,
    `${kind === "invoice" ? "Invoice" : "Receipt"} ${documentNumber(kind, order)}`,
    "",
    `Client: ${order.customerName}`,
    `Order #${order.number}: ${garmentOf(order)}`,
    `Total: ${money(order.priceMinor)}`,
    `Paid: ${money(paid)}`,
    kind === "invoice" ? `Balance due: ${money(balance)}` : "Status: PAID IN FULL",
    kind === "invoice" ? `Ready by: ${formatDate(order.dueAt)}` : `Paid on: ${formatDate(lastPaymentDate(order))}`,
    ...(account ? ["", "*Pay to*", account.bankName, account.accountNumber, account.accountName] : []),
    "",
    kind === "invoice" ? "Thank you for your order." : "Thank you for your patronage.",
    "_Generated with Tayylo_",
  ];
  return lines.join("\n");
}

/** wa.me needs digits with country code; local Nigerian numbers start with 0. */
function whatsappDigits(phone: string | undefined, currency: string) {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0") && currency === "NGN") d = `234${d.slice(1)}`;
  return d.length >= 8 ? d : null;
}

/** Renders the on-screen document to a PNG so it can be sent as a real file. */
async function documentFile(node: HTMLElement, name: string) {
  const { toBlob } = await import("html-to-image");
  const blob = await toBlob(node, {
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    cacheBust: true,
    // On-screen helpers (e.g. "Copy") don't belong in the shared file.
    filter: n => !(n instanceof HTMLElement && n.dataset.exportIgnore !== undefined),
  });
  if (!blob) throw new Error("Couldn't prepare the document");
  return new File([blob], `${name}.png`, { type: "image/png" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------------ page

export function OrderDocumentPage({ orderId, kind }: { orderId: string; kind: DocumentKind }) {
  const router = useRouter();
  const { business } = useBusiness();
  const orderQ = useOrder(orderId);
  const listCopy = React.useMemo(() => getQueryData<Order[]>(qk.orders)?.find(o => o.id === orderId), [orderId]);
  // Pay-to account picked on this screen, shown instantly while it saves.
  const [payTo, setPayTo] = React.useState<string | undefined>(undefined);
  const loaded = orderQ.data !== undefined ? orderQ.data : (listCopy ?? null);
  const order = loaded && payTo !== undefined ? { ...loaded, bankAccountId: payTo } : loaded;
  const customer = useCustomer(order?.customerId ?? null).data ?? null;
  const title = kind === "invoice" ? "Invoice" : "Receipt";
  const docRef = React.useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = React.useState(false);
  const waDigits = order ? whatsappDigits(customer?.phones[0], order.currency) : null;

  /** Share the document itself (image) through the phone's share sheet — WhatsApp, Mail, Messages… */
  const share = async (target?: "whatsapp") => {
    if (!order || sharing) return;
    const text = shareText(kind, order, business);
    const name = documentNumber(kind, order);
    setSharing(true);
    try {
      const file = docRef.current ? await documentFile(docRef.current, name).catch(() => null) : null;
      if (file && !target && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${title} ${name}`, text });
        return;
      }
      if (target === "whatsapp" && waDigits) {
        // WhatsApp links can't carry files: save the image, open the chat with the summary.
        if (file) downloadFile(file);
        window.open(`https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        if (file) toast.success(`${title} image saved — attach it in the chat`);
        return;
      }
      if (navigator.share) {
        await navigator.share({ title: `${title} ${name}`, text });
      } else {
        if (file) downloadFile(file);
        await navigator.clipboard.writeText(text).catch(() => {});
        toast.success(file ? `${title} saved and summary copied` : `${title} summary copied`);
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") toast.error("Couldn't share this document");
    } finally {
      setSharing(false);
    }
  };

  const bar = (
    <div className="sticky top-0 z-20 border-b border-border/70 bg-canvas/90 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-3 sm:gap-2 sm:px-6">
        <BackButton label="Back to order" onClick={() => router.push(`/orders/${orderId}`)} />
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">
          {title}
          {order && <span className="hidden font-medium text-text-tertiary min-[420px]:inline"> · {documentNumber(kind, order)}</span>}
        </p>
        {order && (kind === "invoice" || receiptAvailable(order)) && (
          <>
            {waDigits && (
              <Button variant="secondary" size="sm" disabled={sharing} onClick={() => share("whatsapp")} aria-label="Send to client on WhatsApp">
                <MessageCircle />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            )}
            <Button variant="secondary" size="sm" loading={sharing} onClick={() => share()}>
              <Share2 />
              <span className="hidden sm:inline">Share</span>
            </Button>
            <Button size="sm" onClick={() => window.print()} aria-label="Print or save as PDF">
              <Printer />
              <span className="hidden sm:inline">Print / PDF</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );

  if (!order) {
    return (
      <>
        {bar}
        {orderQ.data === null ? (
          <EmptyState icon={<FileQuestion />} title="Order not found" description="It may have been removed, or the link is incorrect." />
        ) : orderQ.status === "error" ? (
          <ErrorState title={`Couldn't load this ${title.toLowerCase()}`} onRetry={() => orderQ.refetch()} />
        ) : (
          <LoadingRegion label={`Loading ${title.toLowerCase()}`} className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
            <Skeleton variant="rectangular" height={520} className="rounded-[var(--radius-panel)]" />
          </LoadingRegion>
        )}
      </>
    );
  }

  if (kind === "receipt" && !receiptAvailable(order)) {
    const balance = balanceMinor(order);
    return (
      <>
        {bar}
        <EmptyState
          icon={<Lock />}
          title="Receipt not ready yet"
          description={
            order.priceMinor > 0
              ? `The receipt is generated automatically once the order is paid in full. ${formatMoney(balance, order.currency)} is still outstanding.`
              : "Set a price on this order and record payment to generate a receipt."
          }
          action={
            <Button variant="secondary" asChild>
              <Link href={`/orders/${order.id}/invoice`}>View invoice instead</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      {bar}
      <div className="mx-auto max-w-3xl px-3 pt-4 pb-16 sm:px-6 sm:pt-8 print:max-w-none print:p-0">
        {kind === "invoice" && <PayToPicker order={order} business={business} onPick={setPayTo} />}
        <div ref={docRef}>
          <OrderDocument kind={kind} order={order} business={business} customer={customer} />
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------------- document

export function OrderDocument({
  kind,
  order,
  business,
  customer,
}: {
  kind: DocumentKind;
  order: Order;
  business: Business | null;
  customer: Customer | null;
}) {
  const paid = paidMinor(order);
  const balance = balanceMinor(order);
  const money = (m: number) => formatMoney(m, order.currency);
  const lines = linesFor(order);
  const payments = [...order.payments].sort((a, b) => +new Date(a.paidAt) - +new Date(b.paidAt));
  const issued = kind === "invoice" ? new Date(order.createdAt) : lastPaymentDate(order);
  const status = balance <= 0 && order.priceMinor > 0 ? "Paid" : paid > 0 ? "Part paid" : "Unpaid";
  const account = invoiceAccount(business, order.bankAccountId);

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] border border-border/70 bg-surface-raised text-ink shadow-[var(--shadow-xs)]",
        "print:rounded-none print:border-0 print:shadow-none"
      )}
    >
      {/* Brand band */}
      <div className="h-1.5 bg-olive" />

      <div className="px-4 pt-5 pb-6 sm:px-10 sm:pt-10 sm:pb-8">
        <header>
          <div className="flex items-start justify-between gap-4">
            <BrandMark business={business} height={26} className="max-w-[55%]" />
            <div className="shrink-0 text-right">
              <p className="text-[22px] font-semibold uppercase leading-none tracking-[0.08em] text-olive sm:text-[34px]">
                {kind === "invoice" ? "Invoice" : "Receipt"}
              </p>
              <p className="tabular mt-1.5 text-caption font-semibold sm:mt-2 sm:text-label">{documentNumber(kind, order)}</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[17px] font-semibold leading-tight">{business?.name || "Your studio"}</p>
              <p className="text-label text-text-tertiary">
                {[business?.ownerName, business?.country].filter(Boolean).join(" · ") || "Tailoring studio"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-caption font-semibold",
                status === "Paid" ? "bg-success-bg text-success" : status === "Part paid" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
              )}
            >
              {status}
            </span>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-divider py-5 sm:mt-8 sm:grid-cols-3 sm:gap-6">
          <div className="col-span-2 min-w-0 sm:col-span-1">
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Bill to" : "Received from"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{order.customerName}</p>
            {customer?.phones[0] && <p className="text-label text-text-secondary">{customer.phones[0]}</p>}
            {customer?.email && <p className="truncate text-label text-text-secondary">{customer.email}</p>}
          </div>
          <div className="min-w-0">
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Issued" : "Date paid"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{formatDate(issued)}</p>
            <p className="text-label text-text-secondary">Order #{order.number}</p>
          </div>
          <div className="min-w-0">
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Ready by" : "Delivery"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{formatDate(order.dueAt)}</p>
            <p className="text-label capitalize text-text-secondary">{order.statusName.replace(/_/g, " ")}</p>
          </div>
        </div>

        {/* Line items — a table on wide screens, stacked rows on phones */}
        <div className="mt-6">
          <div className="hidden grid-cols-[minmax(0,1fr)_3rem_8rem] pb-2 text-overline uppercase text-text-tertiary sm:grid">
            <span className="font-semibold">Description</span>
            <span className="text-center font-semibold">Qty</span>
            <span className="text-right font-semibold">Amount</span>
          </div>
          <ul className="divide-y divide-divider border-t border-divider">
            {lines.map((l, i) => (
              <li key={i} className="flex items-start gap-3 py-3.5 sm:grid sm:grid-cols-[minmax(0,1fr)_3rem_8rem] sm:gap-0">
                <div className="min-w-0 flex-1 sm:pr-3">
                  <p className="text-[15px] font-semibold">{l.description}</p>
                  {l.detail && <p className="mt-0.5 text-label text-text-secondary">{l.detail}</p>}
                  <p className="mt-0.5 text-caption text-text-tertiary sm:hidden">Qty {l.qty}</p>
                </div>
                <span className="tabular hidden text-center text-[15px] sm:block">{l.qty}</span>
                <span className="tabular shrink-0 text-right text-[15px] font-medium">
                  {l.amount !== undefined ? money(l.amount) : <span className="text-text-tertiary">Included</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals (with the paid stamp beside them on receipts) */}
        <div className="mt-2 flex flex-col-reverse items-center gap-5 border-t border-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
          {kind === "receipt" ? (
            <div className="pointer-events-none rotate-[-8deg] rounded-[var(--radius-control)] border-[3px] border-success/70 px-4 py-1.5 text-[18px] font-bold uppercase tracking-[0.12em] text-success/70 sm:ml-4 sm:text-[22px]">
              Paid in full
            </div>
          ) : (
            <span className="hidden sm:block" />
          )}
          <dl className="w-full space-y-2 text-[15px] sm:max-w-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">Total</dt>
              <dd className="tabular font-semibold">{money(order.priceMinor)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-secondary">{kind === "invoice" ? "Paid to date" : "Amount paid"}</dt>
              <dd className="tabular font-semibold">{money(paid)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-olive px-3 py-2.5 text-text-inverse">
              <dt className="font-semibold">{kind === "invoice" ? "Balance due" : "Balance"}</dt>
              <dd className="tabular text-[18px] font-semibold">{money(Math.max(0, balance))}</dd>
            </div>
          </dl>
        </div>

        {/* Where to pay */}
        {kind === "invoice" && account && balance > 0 && <PayToBox account={account} />}

        {/* Payments */}
        {payments.length > 0 && (
          <section className="mt-8">
            <p className="text-overline uppercase text-text-tertiary">Payments</p>
            <ul className="mt-2 divide-y divide-divider rounded-[var(--radius-card)] border border-border/70">
              {payments.map(p => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-label sm:items-center sm:px-4">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{p.method}</span>
                    <span className="block text-text-tertiary sm:inline">
                      <span className="hidden sm:inline"> · </span>
                      {formatDate(p.paidAt)}
                      {p.reference && ` · ${p.reference}`}
                    </span>
                  </span>
                  <span className="tabular shrink-0 font-semibold text-ink">{money(p.amountMinor)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {order.note && kind === "invoice" && (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-sunken/60 px-4 py-3">
            <p className="text-overline uppercase text-text-tertiary">Note</p>
            <p className="mt-1 text-label text-text-secondary">{order.note}</p>
          </section>
        )}

        <footer className="mt-8 flex flex-col gap-3 border-t border-divider pt-5 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <p className="max-w-sm text-label text-text-secondary">
            {kind === "invoice"
              ? balance > 0
                ? `Please pay the balance of ${money(balance)} on or before collection. Thank you for your order.`
                : "This order is fully paid. Thank you for your order."
              : "Payment received with thanks. We hope you love your garment — thank you for your patronage."}
          </p>
          <p className="flex items-center gap-2 text-caption text-text-tertiary">
            <Logo variant="symbol" height={16} />
            Generated with Tayylo
          </p>
        </footer>
      </div>
    </article>
  );
}

// ----------------------------------------------------------- pay-to box

function PayToBox({ account }: { account: BankAccount }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account.accountNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-olive/30 bg-olive-soft/40 px-4 py-4 sm:px-5">
      <p className="flex items-center gap-1.5 text-overline uppercase text-olive">
        <Landmark size={13} strokeWidth={2} />
        Pay to
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label font-semibold text-text-secondary">{account.bankName}</p>
          <p className="tabular text-[22px] font-semibold leading-tight tracking-wide text-ink sm:text-[24px]">{account.accountNumber}</p>
          <p className="text-label text-ink">{account.accountName}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          data-export-ignore
          className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-caption font-semibold text-ink hover:border-border-strong print:hidden"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
}

/** On-screen only: choose which bank account this invoice shows. */
function PayToPicker({ order, business, onPick }: { order: Order; business: Business | null; onPick: (id: string) => void }) {
  const accounts = bankAccountsOf(business);
  const chosen = invoiceAccount(business, order.bankAccountId)?.id ?? null;
  const [saving, setSaving] = React.useState(false);

  if (accounts.length === 0) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface px-4 py-3 print:hidden">
        <Landmark size={18} strokeWidth={1.75} className="shrink-0 text-text-secondary" />
        <p className="min-w-0 flex-1 text-label text-text-secondary">Add a bank account so clients know where to pay.</p>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/settings">Add</Link>
        </Button>
      </div>
    );
  }
  if (accounts.length < 2) return null;

  const pick = async (id: string) => {
    if (id === chosen || saving) return;
    const prev = chosen;
    onPick(id);
    setSaving(true);
    try {
      await orderRepo.setBankAccount(order.id, id);
    } catch {
      if (prev) onPick(prev);
      toast.error("Couldn't change the account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-4 print:hidden">
      <p className="mb-2 px-1 text-caption font-semibold text-text-tertiary">Pay-to account on this invoice</p>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {accounts.map(a => {
          const active = a.id === chosen;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => pick(a.id)}
              aria-pressed={active}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-label transition-colors",
                active ? "border-olive bg-olive text-text-inverse" : "border-border bg-surface-raised text-ink hover:border-border-strong"
              )}
            >
              {active && <Check size={14} strokeWidth={2.5} />}
              <span className="font-semibold">{a.bankName}</span>
              <span className={cn("tabular", active ? "text-text-inverse/80" : "text-text-tertiary")}>
                ···{a.accountNumber.slice(-4)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
