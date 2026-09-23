"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-3 w-full max-w-sm mx-auto px-4 py-3 bg-olive-deep text-white-warm rounded-[var(--radius-card)] shadow-[var(--shadow-dialog)] text-sm font-medium",
          title: "text-sm font-medium",
          description: "text-xs opacity-80",
          actionButton:
            "ml-auto px-3 py-1.5 rounded-[var(--radius-button)] bg-white-warm/20 text-white-warm text-xs font-medium hover:bg-white-warm/30 transition-colors",
          cancelButton:
            "px-3 py-1.5 text-xs opacity-70 hover:opacity-100 transition-opacity",
        },
      }}
      offset={{ top: "max(16px, env(safe-area-inset-top))" }}
    />
  );
}
