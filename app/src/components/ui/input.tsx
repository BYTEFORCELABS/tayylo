"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  warning?: string;
  unit?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, warning, unit, id, ...props }, ref) => {
    const inputId = id || React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
            {unit && (
              <span className="text-text-tertiary font-normal ml-1">
                ({unit})
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            className={cn(
              "flex h-12 w-full rounded-[var(--radius-input)]",
              "border border-border bg-white-warm",
              "px-4 py-3 text-base text-text-primary",
              "placeholder:text-text-tertiary",
              "transition-colors duration-[var(--duration-fast)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-olive focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              error && "border-danger focus-visible:ring-danger",
              warning && "border-warning focus-visible:ring-warning",
              unit && "pr-14",
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
          {unit && !error && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-tertiary pointer-events-none">
              {unit}
            </span>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-danger flex items-center gap-1"
          >
            {error}
          </p>
        )}
        {warning && !error && (
          <p className="text-xs text-warning flex items-center gap-1">
            {warning}
          </p>
        )}
        {helperText && !error && !warning && (
          <p
            id={`${inputId}-helper`}
            className="text-xs text-text-tertiary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
