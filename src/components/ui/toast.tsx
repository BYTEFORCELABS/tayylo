"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

/** Quiet ink pill toasts — reassuring, never loud. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      icons={{
        success: <CheckCircle2 size={18} strokeWidth={2} className="text-[#B7C49A]" />,
        error: <AlertCircle size={18} strokeWidth={2} className="text-[#F0B4A6]" />,
        info: <Info size={18} strokeWidth={2} />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full max-w-sm items-center gap-3 rounded-full bg-ink py-3 pl-4 pr-5 text-sm font-medium text-text-inverse shadow-[var(--shadow-float)]",
          title: "text-sm font-medium",
          description: "text-xs opacity-75",
          icon: "shrink-0",
          actionButton:
            "ml-auto rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-text-inverse hover:bg-white/25",
          cancelButton: "rounded-full px-3 py-1.5 text-xs opacity-70 hover:opacity-100",
        },
      }}
      offset={{ top: "max(16px, env(safe-area-inset-top))" }}
      mobileOffset={{ top: "max(12px, env(safe-area-inset-top))", left: "16px", right: "16px" }}
    />
  );
}
