"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  /** Sticky footer (primary action) that stays above the keyboard. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Draggable sheet from the bottom edge. On wide screens it is constrained
 * and centred so it never stretches across a desktop monitor.
 */
const BottomSheet: React.FC<BottomSheetProps> = ({ open, onOpenChange, children, title, description, footer, className }) => (
  <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs>
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
      <Drawer.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col",
          "rounded-t-[var(--radius-sheet)] bg-surface-raised shadow-[var(--shadow-sheet)] focus-visible:outline-none",
          className
        )}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span aria-hidden className="h-1 w-10 rounded-full bg-border-strong" />
        </div>

        {title ? (
          <div className="px-6 pt-3 pb-4">
            <Drawer.Title className="text-[20px] font-semibold leading-tight tracking-tight text-ink">{title}</Drawer.Title>
            {description && <Drawer.Description className="mt-1 text-label text-text-secondary">{description}</Drawer.Description>}
          </div>
        ) : (
          <Drawer.Title className="sr-only">Sheet</Drawer.Title>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

        {footer && (
          <div className="border-t border-divider px-6 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>
        )}
        {!footer && <div className="pb-safe" />}
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
);
BottomSheet.displayName = "BottomSheet";

export { BottomSheet };
