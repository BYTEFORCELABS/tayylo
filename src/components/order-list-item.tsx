"use client";

import { GarmentIcon } from "@/components/brand/garment-icon";
import { ListItem } from "@/components/ui/list";
import { StatusTag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import { daysUntil, dueLabel, formatMoney } from "@/lib/format";
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
