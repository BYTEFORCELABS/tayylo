"use client";

import * as React from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Shared control surface: same height, radius, fill and focus treatment
// for every text input, select and textarea in the product.
export const controlBase = [
  "w-full rounded-[var(--radius-input)]",
  "bg-surface-raised border border-border",
  "text-[15px] text-ink placeholder:text-text-tertiary",
  "transition-[border-color,box-shadow] duration-[var(--duration-fast)]",
  "hover:border-border-strong",
  "focus:outline-none focus:border-olive focus:ring-4 focus:ring-olive/12",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/12",
].join(" ");

interface FieldProps {
  label?: React.ReactNode;
  /** Shown after the label in muted text, e.g. "Optional". */
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  warning?: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + message. Use for any custom control too. */
export function Field({ label, hint, helperText, error, warning, id, children, className }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-label font-semibold text-ink">
          <span>{label}</span>
          {hint && <span className="text-caption font-medium text-text-tertiary">{hint}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-message`} role="alert" className="flex items-center gap-1.5 text-caption font-medium text-danger">
          <AlertCircle size={14} strokeWidth={2} aria-hidden />
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-message`} className="flex items-center gap-1.5 text-caption font-medium text-warning">
          <AlertCircle size={14} strokeWidth={2} aria-hidden />
          {warning}
        </p>
      ) : helperText ? (
        <p id={`${id}-message`} className="text-caption text-text-tertiary">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  warning?: string;
  /** Trailing unit / currency text inside the field. */
  unit?: string;
  /** Leading unit / currency text inside the field. */
  prefix?: string;
  leadingIcon?: React.ReactNode;
  trailing?: React.ReactNode;
  containerClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, containerClassName, label, hint, helperText, error, warning, unit, prefix, leadingIcon, trailing, id, ...props },
    ref
  ) => {
    const autoId = React.useId();
    const inputId = id || autoId;
    const hasMessage = !!(error || warning || helperText);

    return (
      <Field
        id={inputId}
        label={label}
        hint={hint}
        helperText={helperText}
        error={error}
        warning={warning}
        className={containerClassName}
      >
        <div className="relative">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary [&_svg]:size-[18px]">
              {leadingIcon}
            </span>
          )}
          {prefix && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-text-tertiary">
              {prefix}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            aria-invalid={!!error || undefined}
            aria-describedby={hasMessage ? `${inputId}-message` : undefined}
            className={cn(
              controlBase,
              "h-12 px-4",
              (leadingIcon || prefix) && "pl-11",
              (unit || trailing) && "pr-12",
              className
            )}
            {...props}
          />
          {unit && (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-label font-medium text-text-tertiary">
              {unit}
            </span>
          )}
          {trailing && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</span>}
        </div>
      </Field>
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, containerClassName, label, hint, helperText, error, id, rows = 4, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id || autoId;
    return (
      <Field id={inputId} label={label} hint={hint} helperText={helperText} error={error} className={containerClassName}>
        <textarea
          id={inputId}
          ref={ref}
          rows={rows}
          aria-invalid={!!error || undefined}
          className={cn(controlBase, "px-4 py-3 leading-relaxed resize-none", className)}
          {...props}
        />
      </Field>
    );
  }
);
Textarea.displayName = "Textarea";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

/** Native select (best on mobile) with the shared control styling. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, label, hint, helperText, error, id, children, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id || autoId;
    return (
      <Field id={inputId} label={label} hint={hint} helperText={helperText} error={error} className={containerClassName}>
        <div className="relative">
          <select
            id={inputId}
            ref={ref}
            className={cn(controlBase, "h-12 pl-4 pr-10 appearance-none", className)}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
        </div>
      </Field>
    );
  }
);
Select.displayName = "Select";

export { Input, Textarea, Select };
