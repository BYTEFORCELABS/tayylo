"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  src?: string;
}

// Muted, warm initials backgrounds — deterministic per name so a client
// always looks the same, without introducing off-brand colours.
const tints = [
  "bg-olive-soft text-olive-deep",
  "bg-beige text-[#5B5240]",
  "bg-[#E3E6E0] text-[#3E4A44]",
  "bg-[#EDE3DA] text-[#6A4E3A]",
  "bg-surface-sunken text-text-secondary",
];

function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return tints[Math.abs(hash) % tints.length];
}

const sizeClasses = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[11px]",
  md: "size-10 text-[13px]",
  lg: "size-12 text-[15px]",
  xl: "size-20 text-[24px]",
};

// Rendered as a <span> so it is valid inside text, buttons and links.
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ name, size = "md", src, className, ...props }, ref) => {
    const [imgError, setImgError] = React.useState(false);
    const showImage = !!src && !imgError;
    return (
      <span
        ref={ref}
        role="img"
        aria-label={name}
        className={cn(
          "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold tracking-tight",
          !showImage && tintFor(name),
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied data URLs / remote photos
          <img src={src} alt="" className="size-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <span aria-hidden>{initials(name)}</span>
        )}
      </span>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
