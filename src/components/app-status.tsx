"use client";

import React from "react";
import { Info, TriangleAlert, Wrench, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface AppConfig {
  maintenance: { message: string } | null;
  announcement: { message: string; tone: "info" | "warning" } | null;
}

const DISMISS_KEY = "tayylo-dismissed-announcement";

/** Reads /api/app-config (set from the admin portal) on load and every few minutes. */
export function useAppConfig() {
  const [config, setConfig] = React.useState<AppConfig | null>(null);
  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/app-config")
        .then(r => (r.ok ? r.json() : null))
        .then(c => alive && c && setConfig(c))
        .catch(() => {});
    load();
    const id = setInterval(load, 3 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return config;
}

export function MaintenanceScreen({ message }: { message: string }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-canvas px-6 text-center">
      <Logo height={28} />
      <div className="flex size-14 items-center justify-center rounded-full bg-olive-soft text-olive">
        <Wrench size={26} strokeWidth={1.75} aria-hidden />
      </div>
      <div className="max-w-sm">
        <h1 className="text-title text-ink">We&rsquo;ll be right back</h1>
        <p className="mt-2 text-body text-text-secondary">{message}</p>
      </div>
      <button type="button" onClick={() => window.location.reload()} className="text-label font-semibold text-olive">
        Try again
      </button>
    </div>
  );
}

export function AnnouncementBanner({ announcement }: { announcement: NonNullable<AppConfig["announcement"]> }) {
  const [hidden, setHidden] = React.useState(true);
  // Read after mount (localStorage doesn't exist on the server).
  React.useEffect(() => {
    const id = setTimeout(() => {
      let dismissed: string | null = null;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY);
      } catch {}
      setHidden(dismissed === announcement.message);
    }, 0);
    return () => clearTimeout(id);
  }, [announcement.message]);
  if (hidden) return null;
  const warning = announcement.tone === "warning";
  const Icon = warning ? TriangleAlert : Info;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 px-4 py-2.5 text-label font-medium lg:pl-[calc(16rem+1rem)] print:hidden",
        warning ? "bg-warning-bg text-warning" : "bg-info-bg text-info"
      )}
    >
      <Icon size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />
      <p className="flex-1">{announcement.message}</p>
      <button
        type="button"
        aria-label="Dismiss"
        className="-m-1 rounded-full p-1 hover:bg-black/5"
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(DISMISS_KEY, announcement.message);
          } catch {}
        }}
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
