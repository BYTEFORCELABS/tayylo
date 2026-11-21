"use client";

// Live production status, animated like a delivery tracker: the progress
// line fills with a spring, finished stages draw their tick, the current
// stage pulses, and the headline rolls to the new stage.

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, BadgeCheck, CircleHelp, CircleX, Clock, PackageCheck, Ruler, Scissors, Spool, Wrench, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRODUCTION_PATH, normalizeStatus, statusLabel } from "@/lib/orders";
import type { OrderStatusName } from "@/types";

const STAGE: Record<OrderStatusName, { icon: LucideIcon; line: string }> = {
  pending: { icon: Clock, line: "Order received — waiting to be cut" },
  cutting: { icon: Scissors, line: "Fabric is being marked and cut" },
  sewing: { icon: Spool, line: "Panels are being stitched together" },
  fitting: { icon: Ruler, line: "Ready for the client to try on" },
  alterations: { icon: Wrench, line: "Adjusting after the fitting" },
  ready: { icon: PackageCheck, line: "Finished and waiting for pickup" },
  delivered: { icon: BadgeCheck, line: "Collected by the client" },
  cancelled: { icon: CircleX, line: "This order was cancelled" },
};

const spring = { type: "spring" as const, stiffness: 260, damping: 26 };

interface Props {
  /** Stored status; unknown values are shown safely rather than crashing. */
  status: OrderStatusName | string;
  /** Persist a new status. The tracker updates immediately (optimistic). */
  onChange: (next: OrderStatusName) => Promise<void>;
  onOpenAll: () => void;
  updating?: boolean;
}

export function ProductionTracker({ status, onChange, onOpenAll, updating }: Props) {
  const reduce = useReducedMotion();

  const known = normalizeStatus(status);
  // Alterations sit on the "Fitting" step of the track.
  const trackStatus = known === "alterations" ? "fitting" : known;
  const index = trackStatus ? PRODUCTION_PATH.indexOf(trackStatus) : -1;
  const last = PRODUCTION_PATH.length - 1;
  // Unknown status: offer to start the production path from the beginning.
  const next = !known ? "pending" : index >= 0 && index < last ? PRODUCTION_PATH[index + 1] : undefined;
  // Mistakes happen: the previous stage is always one tap away.
  const prev = index > 0 ? PRODUCTION_PATH[index - 1] : undefined;
  const cancelled = known === "cancelled";
  const stage = known
    ? STAGE[known]
    : { icon: CircleHelp, line: "This status isn't one Tayylo tracks — choose one under All statuses." };
  const Icon = stage.icon;
  const label = statusLabel(String(status));

  // Celebrate forward moves with a small burst + haptic tick. Tracked with
  // render-time state (React's "adjust state on prop change" pattern).
  const [prevIndex, setPrevIndex] = React.useState(index);
  const [burst, setBurst] = React.useState(0);
  if (index !== prevIndex) {
    if (index > prevIndex) setBurst(b => b + 1);
    setPrevIndex(index);
  }
  React.useEffect(() => {
    if (burst === 0) return;
    try {
      navigator.vibrate?.([12, 40, 12]);
    } catch {}
  }, [burst]);

  const fillPct = index <= 0 ? 0 : (index / last) * 100;

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface">
      {/* Headline */}
      <div className="flex items-start gap-4 px-5 pt-5">
        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={status}
              initial={reduce ? false : { scale: 0.4, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={reduce ? undefined : { scale: 0.4, rotate: 30, opacity: 0 }}
              transition={spring}
              className={cn(
                "flex size-12 items-center justify-center rounded-full",
                cancelled
                  ? "bg-danger-bg text-danger"
                  : known === "delivered"
                    ? "bg-[#16A34A] text-white"
                    : !known
                      ? "bg-surface-sunken text-text-secondary"
                      : "bg-ink text-text-inverse"
              )}
            >
              <Icon size={22} strokeWidth={1.75} />
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-caption font-medium text-text-tertiary">
            {cancelled || index < 0 ? "Production" : `Stage ${index + 1} of ${PRODUCTION_PATH.length}`}
          </p>
          <div className="relative h-8 overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h3
                key={status}
                initial={reduce ? false : { y: 28, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={reduce ? undefined : { y: -28, opacity: 0 }}
                transition={spring}
                className="absolute inset-x-0 text-[24px] font-semibold leading-8 tracking-tight text-ink"
              >
                {label}
              </motion.h3>
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={status}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="text-label text-text-secondary"
            >
              {stage.line}
            </motion.p>
          </AnimatePresence>
        </div>
        <Button variant="ghost" size="sm" onClick={onOpenAll} className="-mr-2 -mt-1 shrink-0">
          All statuses
        </Button>
      </div>

      {/* Track */}
      {!cancelled && (
        <div className="px-5 pt-6 pb-5">
          <div className="relative">
            {/* Base line and animated fill, from first to last node centre */}
            <div className="absolute left-6 right-6 top-3 h-1 -translate-y-1/2 rounded-full bg-surface-sunken" aria-hidden>
              <motion.div
                className="h-full rounded-full bg-olive"
                initial={false}
                animate={{ width: `${fillPct}%` }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
              />
            </div>

            <ol className="relative flex justify-between" aria-label="Production stages">
              {PRODUCTION_PATH.map((s, i) => {
                const done = i < index;
                const current = i === index;
                return (
                  <li key={s} className="flex w-12 justify-center" aria-current={current ? "step" : undefined}>
                    <button
                      type="button"
                      disabled={current || updating}
                      onClick={() => onChange(s)}
                      aria-label={current ? `${statusLabel(s)} (current stage)` : `Set stage to ${statusLabel(s).toLowerCase()}`}
                      title={current ? undefined : `Set to ${statusLabel(s).toLowerCase()}`}
                      className="group flex flex-col items-center gap-2 rounded-[var(--radius-control)] px-1 outline-none enabled:cursor-pointer focus-visible:ring-2 focus-visible:ring-olive/40 disabled:cursor-default"
                    >
                    <span className="relative flex size-6 items-center justify-center transition-transform duration-[var(--duration-fast)] group-enabled:group-hover:scale-110 group-enabled:group-active:scale-95">
                      {current && !reduce && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-olive"
                          initial={{ scale: 1, opacity: 0.35 }}
                          animate={{ scale: 2.1, opacity: 0 }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                        />
                      )}
                      {current && burst > 0 && !reduce && <Burst key={burst} />}
                      <motion.span
                        initial={false}
                        animate={{
                          scale: current ? 1.15 : 1,
                          backgroundColor: done ? "#454F2C" : current ? "#1E2019" : "#ECE9E1",
                        }}
                        transition={reduce ? { duration: 0 } : { ...spring, delay: done ? 0 : 0.15 }}
                        className="relative flex size-6 items-center justify-center rounded-full"
                      >
                        {done && (
                          <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden>
                            <motion.path
                              d="M5 12.5l4.5 4.5L19 7.5"
                              fill="none"
                              stroke="#FBFAF7"
                              strokeWidth={3}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={reduce ? false : { pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.35, delay: 0.1 }}
                            />
                          </svg>
                        )}
                        {current && <span className="size-2 rounded-full bg-text-inverse" />}
                      </motion.span>
                    </span>
                    <span
                      className={cn(
                        "text-center text-[11px] leading-tight transition-colors duration-[var(--duration-normal)]",
                        current ? "font-semibold text-ink" : done ? "text-text-secondary group-hover:text-ink" : "text-text-tertiary group-hover:text-ink"
                      )}
                    >
                      {current && known === "alterations" ? "Alterations" : statusLabel(s)}
                    </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      {/* Step back / move forward */}
      {(next || prev) && (
        <div className={cn("grid gap-2.5 border-t border-divider px-5 py-4", prev && next ? "grid-cols-[auto_minmax(0,1fr)]" : "grid-cols-1")}>
          {prev && (
            <Button
              variant="secondary"
              onClick={() => onChange(prev)}
              disabled={updating}
              aria-label={`Move back to ${statusLabel(prev).toLowerCase()}`}
              className={cn("min-w-0", next && "max-sm:w-12 max-sm:px-0")}
            >
              <ArrowLeft />
              <span className={cn("truncate", next && "max-sm:hidden")}>Back to {statusLabel(prev).toLowerCase()}</span>
            </Button>
          )}
          {next && (
          <Button variant="primary" onClick={() => onChange(next)} disabled={updating} className="w-full min-w-0 overflow-hidden">
            <span className="relative flex h-5 items-center overflow-hidden">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={next}
                  initial={reduce ? false : { y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={reduce ? undefined : { y: -20, opacity: 0 }}
                  transition={spring}
                  className="block"
                >
                  {known ? `Move to ${statusLabel(next).toLowerCase()}` : "Start at pending"}
                </motion.span>
              </AnimatePresence>
            </span>
            <ArrowRight />
          </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Eight dots that fly out from the newly reached stage. */
function Burst() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }).map((_, k) => {
        const a = (k / 8) * Math.PI * 2;
        return (
          <motion.span
            key={k}
            className="absolute left-1/2 top-1/2 size-1.5 rounded-full bg-olive"
            initial={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
            animate={{ x: `calc(-50% + ${Math.cos(a) * 26}px)`, y: `calc(-50% + ${Math.sin(a) * 26}px)`, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.25 }}
          />
        );
      })}
    </span>
  );
}
