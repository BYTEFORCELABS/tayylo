"use client";

import * as React from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  showPrevious?: boolean;
  className?: string;
  /** Imperial uses tailor fractions (¼ ½ ¾); metric uses decimal precision instead. */
  unit?: "imperial" | "metric";
}

const imperialKeys = [
  ["1", "2", "3", "¼"],
  ["4", "5", "6", "½"],
  ["7", "8", "9", "¾"],
  [".", "0", "⌫", "Skip"],
] as const;

const metricKeys = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
] as const;

const FRACTIONS = ["¼", "½", "¾"];

const Keypad: React.FC<KeypadProps> = ({
  value,
  onChange,
  onNext,
  onPrevious,
  onSkip,
  nextLabel = "Next",
  showPrevious = true,
  className,
  unit = "imperial",
}) => {
  const keys = unit === "metric" ? metricKeys : imperialKeys;

  const press = React.useCallback(
    (key: string) => {
      try {
        navigator.vibrate?.(4);
      } catch {}
      switch (key) {
        case "⌫":
          onChange(value.slice(0, -1));
          break;
        case "Skip":
          onSkip?.();
          break;
        case ".":
          if (!value.includes(".") && !FRACTIONS.some(f => value.includes(f))) onChange(value + ".");
          break;
        case "¼":
        case "½":
        case "¾": {
          const whole = value.replace(/[¼½¾]/g, "").replace(/\.\d*$/, "");
          onChange(whole + key);
          break;
        }
        default:
          if (FRACTIONS.some(f => value.includes(f))) return;
          if (value.replace(".", "").length >= 5) return;
          onChange(value + key);
      }
    },
    [value, onChange, onSkip]
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("grid gap-2", unit === "metric" ? "grid-cols-3" : "grid-cols-4")}>
        {keys.flat().map(key => {
          const isFraction = FRACTIONS.includes(key);
          const isUtility = key === "⌫" || key === "Skip";
          return (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              aria-label={key === "⌫" ? "Delete" : key === "Skip" ? "Skip this measurement" : key}
              className={cn(
                "flex h-14 items-center justify-center rounded-[var(--radius-control)] select-none",
                "transition-[background-color,transform] duration-[var(--duration-fast)] active:scale-[0.95]",
                isUtility
                  ? "text-label font-semibold text-text-secondary hover:bg-surface-sunken active:bg-surface-sunken"
                  : isFraction
                    ? "bg-olive-soft text-[22px] font-semibold text-olive-deep hover:bg-[#DCE0CC]"
                    : "bg-surface-raised text-[22px] font-medium text-ink shadow-[var(--shadow-xs)] hover:bg-surface active:bg-beige-light"
              )}
            >
              {key === "⌫" ? <Delete size={22} strokeWidth={1.75} /> : key}
            </button>
          );
        })}
      </div>

      {unit === "metric" && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="self-center rounded-full px-3 py-1.5 text-label font-semibold text-text-tertiary hover:bg-surface-sunken hover:text-ink"
        >
          Skip this measurement
        </button>
      )}

      <div className="flex gap-2.5">
        {showPrevious && (
          <Button type="button" variant="secondary" size="lg" onClick={onPrevious} className="flex-1">
            Previous
          </Button>
        )}
        <Button type="button" size="lg" onClick={onNext} className={cn(showPrevious ? "flex-[2]" : "w-full", "min-w-0")}>
          <span className="truncate">{nextLabel}</span>
        </Button>
      </div>
    </div>
  );
};
Keypad.displayName = "Keypad";

export { Keypad };
