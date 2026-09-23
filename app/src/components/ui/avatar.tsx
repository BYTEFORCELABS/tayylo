"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  src?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Deterministic color from name for slight variation
function getAvatarBg(name: string): string {
  // All olive-tinted backgrounds
  const bgs = [
    "bg-olive/10",
    "bg-olive/15",
    "bg-olive/12",
    "bg-beige-light",
    "bg-olive/8",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgs[Math.abs(hash) % bgs.length];
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg",
};

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ name, size = "md", src, className, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold select-none shrink-0",
          "text-olive",
          !src || imgError ? getAvatarBg(name) : "",
          sizeClasses[size],
          className
        )}
        aria-label={name}
        {...props}
      >
        {src && !imgError ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full rounded-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          getInitials(name)
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
