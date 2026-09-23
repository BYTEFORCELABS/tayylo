"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Skeleton
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        "skeleton",
        {
          "h-4 rounded": variant === "text",
          "rounded-full": variant === "circular",
          "rounded-[var(--radius-card)]": variant === "rectangular",
        },
        className
      )}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};
Skeleton.displayName = "Skeleton";

// Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-beige-light flex items-center justify-center text-text-tertiary mb-4">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">
        {description}
      </p>
      {action}
    </div>
  );
};
EmptyState.displayName = "EmptyState";

// Error State
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  description = "We couldn\u2019t load this content. Check your connection and try again.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-danger-bg flex items-center justify-center text-danger mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="font-serif text-lg font-medium text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-xs mb-6">
        {description}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="h-10 px-4 rounded-[var(--radius-button)] bg-olive text-white-warm text-sm font-medium hover:bg-olive-deep transition-colors active:scale-[0.98]"
        >
          Try again
        </button>
      )}
    </div>
  );
};
ErrorState.displayName = "ErrorState";

// Offline Banner
const OfflineBanner: React.FC = () => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-beige-light text-text-secondary text-xs">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="2" x2="22" y2="22" />
        <path d="M8.5 16.5a5 5 0 017 0" />
        <path d="M2 8.82a15 15 0 014.17-2.65" />
        <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
        <path d="M16.85 11.25a10 10 0 012.22 1.68" />
        <path d="M5 12.86a10 10 0 015.04-2.54" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>
      <span>Saved on this device. Will sync when you&apos;re online.</span>
    </div>
  );
};
OfflineBanner.displayName = "OfflineBanner";

// Loading State (client list skeleton)
const ClientListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 flex flex-col gap-1.5">
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={80} height={12} />
        </div>
      ))}
    </div>
  );
};
ClientListSkeleton.displayName = "ClientListSkeleton";

// Measurement grid skeleton
const MeasurementGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 p-3 rounded-[var(--radius-card)] border border-border bg-white-warm">
          <Skeleton width="50%" height={12} />
          <Skeleton width="70%" height={28} />
        </div>
      ))}
    </div>
  );
};
MeasurementGridSkeleton.displayName = "MeasurementGridSkeleton";

export {
  Skeleton,
  EmptyState,
  ErrorState,
  OfflineBanner,
  ClientListSkeleton,
  MeasurementGridSkeleton,
};
