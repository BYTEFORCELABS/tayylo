"use client";

// Printable invoice and receipt for an order, generated from the order's
// own data: garment, services, agreed price and payments. "Print / Save
// PDF" uses the browser's print dialog; the app chrome is hidden in print.

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Printer, Share2, FileQuestion, Lock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { Logo } from "@/components/brand/logo";
import { getQueryData } from "@/lib/query";
import { qk, useCustomer, useOrder } from "@/lib/queries";
import { useBusiness } from "@/lib/use-business";
import { formatDate, formatMoney } from "@/lib/format";
import { balanceMinor, garmentOf, paidMinor } from "@/lib/orders";
import { cn } from "@/lib/utils";
import type { Business, Customer, Order } from "@/types";

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
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
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
  const order = orderQ.data !== undefined ? orderQ.data : (listCopy ?? null);
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
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 sm:px-6">
        <Button variant="ghost" size="icon" aria-label="Back to order" onClick={() => router.push(`/orders/${orderId}`)}>
          <ArrowLeft />
        </Button>
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">
          {title}
          {order && <span className="font-medium text-text-tertiary"> · {documentNumber(kind, order)}</span>}
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
            <Button size="sm" onClick={() => window.print()}>
              <Printer />
              Print / PDF
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

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-panel)] border border-border/70 bg-surface-raised text-ink shadow-[var(--shadow-xs)]",
        "print:rounded-none print:border-0 print:shadow-none"
      )}
    >
      {/* Brand band */}
      <div className="h-1.5 bg-olive" />

      <div className="px-5 pt-6 pb-8 sm:px-10 sm:pt-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <Logo height={30} />
            <p className="mt-4 text-[17px] font-semibold leading-tight">{business?.name || "Your studio"}</p>
            <p className="text-label text-text-tertiary">
              {[business?.ownerName, business?.country].filter(Boolean).join(" · ") || "Tailoring studio"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[28px] font-semibold uppercase leading-none tracking-[0.08em] text-olive sm:text-[34px]">
              {kind === "invoice" ? "Invoice" : "Receipt"}
            </p>
            <p className="tabular mt-2 text-label font-semibold">{documentNumber(kind, order)}</p>
            <span
              className={cn(
                "mt-2 inline-block rounded-full px-2.5 py-0.5 text-caption font-semibold",
                status === "Paid" ? "bg-success-bg text-success" : status === "Part paid" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
              )}
            >
              {status}
            </span>
          </div>
        </header>

        <div className="mt-8 grid gap-6 border-y border-divider py-5 sm:grid-cols-3">
          <div>
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Bill to" : "Received from"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{order.customerName}</p>
            {customer?.phones[0] && <p className="text-label text-text-secondary">{customer.phones[0]}</p>}
            {customer?.email && <p className="text-label text-text-secondary">{customer.email}</p>}
          </div>
          <div>
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Issued" : "Date paid"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{formatDate(issued)}</p>
            <p className="text-label text-text-secondary">Order #{order.number}</p>
          </div>
          <div>
            <p className="text-overline uppercase text-text-tertiary">{kind === "invoice" ? "Ready by" : "Delivery"}</p>
            <p className="mt-1.5 text-[15px] font-semibold">{formatDate(order.dueAt)}</p>
            <p className="text-label capitalize text-text-secondary">{order.statusName.replace(/_/g, " ")}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="mt-6 w-full text-left">
          <thead>
            <tr className="text-overline uppercase text-text-tertiary">
              <th className="pb-2 font-semibold">Description</th>
              <th className="w-12 pb-2 text-center font-semibold">Qty</th>
              <th className="w-32 pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-divider border-t border-divider">
            {lines.map((l, i) => (
              <tr key={i} className="align-top">
                <td className="py-3.5 pr-3">
                  <p className="text-[15px] font-semibold">{l.description}</p>
                  {l.detail && <p className="mt-0.5 text-label text-text-secondary">{l.detail}</p>}
                </td>
                <td className="tabular py-3.5 text-center text-[15px]">{l.qty}</td>
                <td className="tabular py-3.5 text-right text-[15px] font-medium">
                  {l.amount !== undefined ? money(l.amount) : <span className="text-text-tertiary">Included</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-2 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 border-t border-divider pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-text-secondary">Total</dt>
              <dd className="tabular font-semibold">{money(order.priceMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">{kind === "invoice" ? "Paid to date" : "Amount paid"}</dt>
              <dd className="tabular font-semibold">{money(paid)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-olive px-3 py-2.5 text-text-inverse">
              <dt className="font-semibold">{kind === "invoice" ? "Balance due" : "Balance"}</dt>
              <dd className="tabular text-[18px] font-semibold">{money(Math.max(0, balance))}</dd>
            </div>
          </dl>
        </div>

        {/* Payments */}
        {payments.length > 0 && (
          <section className="mt-8">
            <p className="text-overline uppercase text-text-tertiary">Payments</p>
            <ul className="mt-2 divide-y divide-divider rounded-[var(--radius-card)] border border-border/70">
              {payments.map(p => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-label">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">{p.method}</span>
                    <span className="text-text-tertiary">
                      {" "}
                      · {formatDate(p.paidAt)}
                      {p.reference && ` · ${p.reference}`}
                    </span>
                  </span>
                  <span className="tabular font-semibold text-ink">{money(p.amountMinor)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {kind === "receipt" && (
          <div className="pointer-events-none absolute right-6 top-40 rotate-[-12deg] rounded-[var(--radius-control)] border-[3px] border-success/70 px-4 py-1.5 text-[22px] font-bold uppercase tracking-[0.12em] text-success/70 sm:right-12">
            Paid in full
          </div>
        )}

        {order.note && kind === "invoice" && (
          <section className="mt-8 rounded-[var(--radius-card)] bg-surface-sunken/60 px-4 py-3">
            <p className="text-overline uppercase text-text-tertiary">Note</p>
            <p className="mt-1 text-label text-text-secondary">{order.note}</p>
          </section>
        )}

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-4 border-t border-divider pt-5">
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
