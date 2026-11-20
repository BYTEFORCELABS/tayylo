"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] animate-fade-in", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

/**
 * On phones the dialog docks to the bottom edge like a sheet (thumb
 * reach, keyboard-safe); from `sm` up it is a centred card.
 */
const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideClose?: boolean }
>(({ className, children, hideClose, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex max-h-[92dvh] flex-col overflow-y-auto bg-surface-raised p-6 shadow-[var(--shadow-dialog)] focus-visible:outline-none",
        // mobile: bottom sheet
        "inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)] pb-[max(24px,env(safe-area-inset-bottom))] animate-rise-in",
        // sm+: centred card
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%-32px)] sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-dialog)] sm:pb-6 sm:animate-scale-in",
        className
      )}
      {...props}
    >
      <span aria-hidden className="mx-auto -mt-2 mb-4 block h-1 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" />
      {children}
      {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-4 top-4 flex size-9 items-center justify-center rounded-full text-text-tertiary",
            "transition-colors hover:bg-surface-sunken hover:text-ink max-sm:top-5"
          )}
          aria-label="Close"
        >
          <X size={18} strokeWidth={1.75} />
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col gap-1.5 pb-5 pr-10", className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-[20px] font-semibold leading-tight tracking-tight text-ink", className)} {...props} />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-label text-text-secondary", className)} {...props} />
));
DialogDescription.displayName = "DialogDescription";

/** Actions stack full-width on phones (primary on top), row on larger screens. */
const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      "mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end [&>*]:max-sm:w-full",
      className
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogOverlay,
};
