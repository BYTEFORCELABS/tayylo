"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap",
    "font-semibold leading-none select-none",
    "rounded-full",
    "transition-[background-color,color,border-color,box-shadow,transform,opacity]",
    "duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-2 focus-visible:outline-olive focus-visible:outline-offset-2",
    "disabled:opacity-45 disabled:pointer-events-none",
    "active:scale-[0.97]",
    "[&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        /** The one main action on a screen. */
        primary: "bg-olive text-text-inverse hover:bg-olive-deep",
        /** Neutral action next to a primary one. */
        secondary:
          "bg-surface-raised text-ink border border-border hover:border-border-strong hover:bg-surface",
        /** Soft olive fill — supporting actions that still need presence. */
        tonal: "bg-olive-soft text-olive-deep hover:bg-[#DCE0CC]",
        /** Text-weight action. */
        ghost: "bg-transparent text-ink hover:bg-surface-sunken/70",
        /** Text link styled action in olive. */
        tertiary: "bg-transparent text-olive hover:bg-olive-soft/60",
        /** For dark summary panels. */
        inverse: "bg-text-inverse text-olive-deep hover:bg-white",
        "inverse-ghost": "bg-white/10 text-text-inverse hover:bg-white/16",
        destructive: "bg-transparent text-danger hover:bg-danger-bg",
        "destructive-filled": "bg-danger text-text-inverse hover:bg-[#86321F]",
      },
      size: {
        sm: "h-9 px-4 text-[13px] [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-[18px]",
        lg: "h-[52px] px-6 text-[15px] [&_svg]:size-5",
        icon: "size-11 p-0 [&_svg]:size-5",
        "icon-sm": "size-9 p-0 [&_svg]:size-[18px]",
        "icon-lg": "size-[52px] p-0 [&_svg]:size-[22px]",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, keeps the width, and disables the button. */
  loading?: boolean;
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 rounded-full border-2 border-current border-r-transparent animate-spin"
    />
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, block }), className)} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <button
        className={cn(buttonVariants({ variant, size, block }), className)}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="invisible inline-flex items-center gap-2">{children}</span>
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, Spinner };
