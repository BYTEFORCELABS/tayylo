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
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  open,
  onOpenChange,
  children,
  title,
  description,
}) => {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-white-warm rounded-t-[var(--radius-sheet)]",
            "max-h-[85dvh] flex flex-col",
            "focus-visible:outline-none"
          )}
          style={{
            boxShadow: "var(--shadow-sheet)",
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          {(title || description) && (
            <div className="px-5 pb-3">
              {title && (
                <Drawer.Title className="text-lg font-semibold text-text-primary">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-sm text-text-secondary mt-1">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-safe">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
BottomSheet.displayName = "BottomSheet";

export { BottomSheet };
