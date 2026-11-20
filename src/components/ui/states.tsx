"use client";

import * as React from "react";
import { AlertCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// --------------------------------------------------------------- Skeleton

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ variant = "text", width, height, className, style, ...props }) => (
  <div
    className={cn(
      "skeleton",
      {
        "h-4 rounded-full": variant === "text",
        "rounded-full": variant === "circular",
        "rounded-[var(--radius-card)]": variant === "rectangular",
      },
      className
    )}
    style={{
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
      ...style,
    }}
    aria-hidden="true"
    {...props}
  />
);

/** Wrap skeleton blocks so screen readers hear one "Loading" instead of nothing. */
function LoadingRegion({ label = "Loading", className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    // Fades in after a short delay so quick loads never flash a skeleton.
    <div role="status" aria-live="polite" className={cn("animate-fade-in [animation-delay:180ms]", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

// ------------------------------------------------------------- EmptyState

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** `inset` sits inside a card/tab; `page` fills a screen. */
  variant?: "page" | "inset";
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, variant = "page", className }) => (
  <div
    className={cn(
      "flex flex-col items-center text-center animate-rise-in",
      variant === "page" ? "py-16 px-6" : "rounded-[var(--radius-card)] border border-dashed border-border-strong/70 px-6 py-10",
      className
    )}
  >
    {icon && (
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-surface-sunken text-text-secondary [&_svg]:size-6">
        {icon}
      </div>
    )}
    <h3 className="text-headline text-ink">{title}</h3>
    {description && <p className="mt-1.5 max-w-xs text-label text-text-secondary">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

// ------------------------------------------------------------- ErrorState

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "We couldn’t load this. Check your connection and try again.",
  onRetry,
  className,
}) => (
  <div role="alert" className={cn("flex flex-col items-center py-16 px-6 text-center animate-rise-in", className)}>
    <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-danger-bg text-danger">
      <AlertCircle size={24} strokeWidth={1.75} />
    </div>
    <h3 className="text-headline text-ink">{title}</h3>
    <p className="mt-1.5 max-w-xs text-label text-text-secondary">{description}</p>
    {onRetry && (
      <Button className="mt-5" variant="secondary" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

// ---------------------------------------------------------- Offline banner

function useOnline() {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

/** Self-managing: renders only while the browser reports it is offline. */
const OfflineBanner: React.FC<{ force?: boolean }> = ({ force }) => {
  const online = useOnline();
  if (online && !force) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[70] -translate-x-1/2 animate-rise-in flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-label font-medium text-text-inverse shadow-[var(--shadow-float)]"
    >
      <WifiOff size={16} strokeWidth={1.75} />
      You&apos;re offline. Changes won&apos;t save until you reconnect.
    </div>
  );
};

// ---------------------------------------------------------- Skeleton sets

const ListSkeleton: React.FC<{ count?: number; avatar?: boolean }> = ({ count = 5, avatar = true }) => (
  <LoadingRegion>
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface divide-y divide-divider">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex min-h-[64px] items-center gap-3.5 px-4 py-3.5">
          {avatar && <Skeleton variant="circular" width={40} height={40} />}
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton width={`${55 - (i % 3) * 10}%`} height={14} />
            <Skeleton width="35%" height={12} />
          </div>
          <Skeleton width={56} height={12} />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

const ClientListSkeleton = ListSkeleton;

const MeasurementGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <LoadingRegion>
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-divider sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 bg-surface p-4">
          <Skeleton width="50%" height={12} />
          <Skeleton width="40%" height={24} />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export {
  Skeleton,
  LoadingRegion,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ListSkeleton,
  ClientListSkeleton,
  MeasurementGridSkeleton,
  useOnline,
};
