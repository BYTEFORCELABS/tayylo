"use client";

import Link from "next/link";
import { GarmentIcon } from "@/components/brand/garment-icon";
import { Avatar } from "@/components/ui/avatar";
import { ListItem } from "@/components/ui/list";
import { StatusTag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { daysUntil, dueLabel, formatDateShort, formatMoney } from "@/lib/format";
import { balanceMinor, displayStatus, garmentOf, isActive, isOverdue } from "@/lib/orders";
import { prefetchOrder } from "@/lib/queries";
import type { Order } from "@/types";

/** Garment thumbnail: the order's own photo, otherwise a quiet icon tile. */
export function GarmentThumb({ order, size = "md" }: { order: Order; size?: "md" | "lg" }) {
  const img = order.items[0]?.imageUrl;
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-surface-sunken text-ink/80",
        size === "md" ? "size-11" : "size-14"
      )}
    >
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads
        <img src={img} alt="" className="size-full object-cover" />
      ) : (
        <GarmentIcon garment={order.items[0]?.garmentType} size={size === "md" ? 28 : 34} label="" />
      )}
    </span>
  );
}

interface OrderListItemProps {
  order: Order;
  /** Hide the client name (when already on that client's profile). */
  hideClient?: boolean;
}

/** One row per order — identical on Today, Orders and Client profile. */
export function OrderListItem({ order, hideClient }: OrderListItemProps) {
  const bal = balanceMinor(order);
  const active = isActive(order);
  const overdue = isOverdue(order);
  const days = daysUntil(order.dueAt);

  const dueTone = overdue ? "text-danger" : active && days <= 3 ? "text-warning" : "text-text-tertiary";

  return (
    <ListItem
      href={`/orders/${order.id}`}
      onPrefetch={() => prefetchOrder(order.id)}
      leading={<GarmentThumb order={order} />}
      title={garmentOf(order)}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          {hideClient ? (
            <span className="tabular shrink-0">#{order.number}</span>
          ) : (
            <span className="min-w-0 truncate">{order.customerName}</span>
          )}
          {bal > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular shrink-0 font-semibold text-text-secondary">{formatMoney(bal, order.currency)} due</span>
            </>
          )}
        </span>
      }
      trailing={<StatusTag status={displayStatus(order)} />}
      trailingSub={
        active ? (
          <span className={cn("font-medium", dueTone)}>{dueLabel(order.dueAt)}</span>
        ) : bal === 0 && order.priceMinor > 0 ? (
          "Paid"
        ) : undefined
      }
    />
  );
}

/**
 * Phone-first order row: photo with the order number on it, garment and
 * description, the client as a small chip, and price / status / due date
 * stacked on the right.
 */
export function OrderRow({ order, hideClient, clientPhoto }: OrderListItemProps & { clientPhoto?: string }) {
  const bal = balanceMinor(order);
  const active = isActive(order);
  const overdue = isOverdue(order);
  const days = daysUntil(order.dueAt);
  const img = order.items[0]?.imageUrl;
  const pieces = order.items.length;
  const description =
    order.items[0]?.styleNotes?.trim() || order.note?.trim() || `${pieces} ${pieces === 1 ? "piece" : "pieces"}`;
  const dueTone = overdue ? "text-danger" : active && days <= 3 ? "text-warning" : "text-text-tertiary";

  return (
    <Link
      href={`/orders/${order.id}`}
      onMouseEnter={() => prefetchOrder(order.id)}
      onTouchStart={() => prefetchOrder(order.id)}
      className="flex items-center gap-3.5 rounded-[var(--radius-card)] px-1 py-3 transition-colors hover:bg-surface/70 active:bg-surface"
    >
      <span className="relative flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-border/60 bg-surface-raised text-ink/80">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- user uploads
          <img src={img} alt="" className="size-full object-cover" />
        ) : (
          <GarmentIcon garment={order.items[0]?.garmentType} size={34} label="" />
        )}
        <span className="tabular absolute inset-x-1 bottom-1 truncate rounded-[6px] bg-white/90 py-px text-center text-[9px] font-semibold text-ink">
          #{order.number}
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium leading-snug text-ink">{garmentOf(order)}</span>
        <span className="mt-0.5 block truncate text-[13px] text-text-secondary">{description}</span>
        {!hideClient && (
          <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
            <Avatar name={order.customerName} src={clientPhoto} size="xs" shape="rounded" className="size-5 text-[9px]" />
            <span className="truncate text-[13px] text-text-secondary">{order.customerName}</span>
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5 text-right">
        <span className="tabular text-[15px] font-semibold text-ink">
          {order.priceMinor > 0 ? formatMoney(order.priceMinor, order.currency) : "—"}
        </span>
        <StatusTag status={displayStatus(order)} size="sm" />
        <span className={cn("tabular text-[11.5px]", active ? cn("font-medium", dueTone) : "text-text-tertiary")}>
          {active
            ? overdue || days <= 7
              ? dueLabel(order.dueAt)
              : `Due ${formatDateShort(order.dueAt)}`
            : bal > 0
              ? `${formatMoney(bal, order.currency)} bal`
              : order.priceMinor > 0
                ? "Paid"
                : ""}
        </span>
      </span>
    </Link>
  );
}
