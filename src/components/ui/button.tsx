"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium text-sm leading-tight",
    "rounded-[var(--radius-button)]",
    "transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "focus-visible:outline-2 focus-visible:outline-olive focus-visible:outline-offset-[3px]",
    "disabled:opacity-50 disabled:pointer-events-none",
    "select-none cursor-pointer",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-olive text-white-warm hover:bg-olive-deep shadow-none",
        secondary:
          "bg-white-warm text-text-primary border border-border hover:bg-beige-light",
        tertiary:
          "text-olive hover:bg-beige-light bg-transparent",
        destructive:
          "text-danger hover:bg-danger-bg bg-transparent",
        "destructive-filled":
          "bg-danger text-white-warm hover:opacity-90",
        ghost:
          "text-text-secondary hover:bg-beige-light bg-transparent",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-12 w-12 p-0",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
