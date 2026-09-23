"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  showPrevious?: boolean;
  className?: string;
}

const keypadKeys = [
  ["1", "2", "3", "¼"],
  ["4", "5", "6", "½"],
  ["7", "8", "9", "¾"],
  [".", "0", "⌫", "Skip"],
] as const;

const Keypad: React.FC<KeypadProps> = ({
  value,
  onChange,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = "Next",
  showPrevious = true,
  className,
}) => {
  const handleKeyPress = React.useCallback(
    (key: string) => {
      switch (key) {
        case "⌫":
          onChange(value.slice(0, -1));
          break;
        case "Skip":
          onSkip?.();
          break;
        case ".":
          if (!value.includes(".") && !value.includes("¼") && !value.includes("½") && !value.includes("¾")) {
            onChange(value + ".");
          }
          break;
        case "¼":
        case "½":
        case "¾":
          // Replace existing fraction or append
          const withoutFraction = value.replace(/[¼½¾]/g, "").replace(/\.\d*$/, "");
          onChange(withoutFraction + key);
          break;
        default:
          // Don't allow decimals after fractions
          if (value.includes("¼") || value.includes("½") || value.includes("¾")) return;
          onChange(value + key);
      }
    },
    [value, onChange, onSkip]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Keypad grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {keypadKeys.flat().map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeyPress(key)}
            className={cn(
              "h-12 rounded-[var(--radius-button)] text-lg font-medium",
              "transition-all duration-[var(--duration-fast)]",
              "active:scale-[0.96] select-none",
              "focus-visible:outline-2 focus-visible:outline-olive focus-visible:outline-offset-1",
              key === "Skip"
                ? "bg-transparent text-text-tertiary text-sm hover:bg-beige-light"
                : key === "⌫"
                ? "bg-transparent text-text-secondary hover:bg-beige-light"
                : key === "¼" || key === "½" || key === "¾"
                ? "bg-beige-light text-olive-deep hover:bg-beige"
                : "bg-white-warm text-text-primary border border-border hover:bg-beige-light"
            )}
            aria-label={
              key === "⌫" ? "Backspace" : key === "Skip" ? "Skip this field" : key
            }
          >
            {key === "⌫" ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2 mt-1">
        {showPrevious && (
          <button
            type="button"
            onClick={onPrevious}
            className="flex-1 h-12 rounded-[var(--radius-button)] bg-white-warm border border-border text-text-primary text-sm font-medium hover:bg-beige-light transition-colors active:scale-[0.98]"
          >
            Previous
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className={cn(
            "h-12 rounded-[var(--radius-button)] bg-olive text-white-warm text-sm font-medium hover:bg-olive-deep transition-colors active:scale-[0.98]",
            showPrevious ? "flex-1" : "w-full"
          )}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
};
Keypad.displayName = "Keypad";

export { Keypad };
