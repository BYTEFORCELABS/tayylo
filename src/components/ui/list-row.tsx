"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  meta?: string;
  avatarName?: string;
  avatarSrc?: string;
  trailing?: React.ReactNode;
  href?: string;
  showChevron?: boolean;
}

const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
  (
    {
      title,
      subtitle,
      meta,
      avatarName,
      avatarSrc,
      trailing,
      showChevron = true,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          "border-b border-border last:border-b-0",
          "transition-colors duration-[var(--duration-fast)]",
          "hover:bg-beige-light/50 cursor-pointer",
          "active:bg-beige-light",
          className
        )}
        role="button"
        tabIndex={0}
        {...props}
      >
        {avatarName && (
          <Avatar name={avatarName} src={avatarSrc} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-text-secondary truncate mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {meta && (
          <span className="text-xs text-text-tertiary whitespace-nowrap shrink-0">
            {meta}
          </span>
        )}
        {trailing}
        {showChevron && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-text-tertiary shrink-0"
          >
            <polyline points="6 4 10 8 6 12" />
          </svg>
        )}
      </div>
    );
  }
);
ListRow.displayName = "ListRow";

export { ListRow };
