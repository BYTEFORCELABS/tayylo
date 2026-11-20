"use client";

import React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, BellOff } from "lucide-react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { IconTile } from "@/components/ui/list";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { type AppNotification, markSeen, readSeen } from "@/lib/notifications";

const kindIcon = {
  overdue: { icon: <AlertCircle />, tone: "danger" as const },
  "due-soon": { icon: <Clock />, tone: "warning" as const },
  ready: { icon: <CheckCircle2 />, tone: "success" as const },
  balance: { icon: <Clock />, tone: "neutral" as const },
};

export function useUnreadCount(items: AppNotification[]) {
  // `version` bumps after the sheet marks items as seen, re-reading storage.
  const [version, setVersion] = React.useState(0);
  const seen = React.useMemo(
    () => readSeen(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when items or version change
    [items, version]
  );
  return {
    unread: items.filter(i => !seen.has(i.id)).length,
    isUnread: (id: string) => !seen.has(id),
    refresh: () => setVersion(v => v + 1),
  };
}

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AppNotification[];
  onSeen?: () => void;
}

export function NotificationsSheet({ open, onOpenChange, items, onSeen }: NotificationsSheetProps) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Notifications"
      description="Deadlines, ready garments and overdue work across your orders."
    >
      <NotificationList key={open ? "open" : "closed"} open={open} items={items} onSeen={onSeen} onNavigate={() => onOpenChange(false)} />
    </BottomSheet>
  );
}

function NotificationList({
  open,
  items,
  onSeen,
  onNavigate,
}: {
  open: boolean;
  items: AppNotification[];
  onSeen?: () => void;
  onNavigate: () => void;
}) {
  // Snapshot unread state when the sheet opens, then mark all as seen —
  // so dots stay visible while reading but are gone next time.
  const [unreadAtOpen] = React.useState<Set<string>>(() => {
    const seen = readSeen();
    return new Set(items.filter(i => !seen.has(i.id)).map(i => i.id));
  });
  React.useEffect(() => {
    if (!open) return;
    markSeen(items.map(i => i.id));
    onSeen?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [open]);

  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          variant="inset"
          icon={<BellOff />}
          title="You're all caught up"
          description="Overdue orders, upcoming deadlines and garments ready for pickup will show up here."
        />
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.map(n => {
            const k = kindIcon[n.kind];
            const unread = unreadAtOpen.has(n.id);
            return (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={onNavigate}
                  className="flex items-start gap-3.5 rounded-[var(--radius-card)] px-2 py-3 transition-colors hover:bg-beige-light/70"
                >
                  <IconTile tone={k.tone}>{k.icon}</IconTile>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[15px] leading-snug text-ink", unread ? "font-semibold" : "font-medium")}>{n.title}</p>
                    <p className="mt-0.5 text-label text-text-tertiary">{n.detail}</p>
                  </div>
                  {unread && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-olive" />}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
