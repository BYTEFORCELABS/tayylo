"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DeltaChip } from "./tag";

interface MeasurementDisplayProps {
  fieldName: string;
  value: string;
  unit: string;
  previousValue?: string;
  previousDate?: string;
  size?: "sm" | "md" | "lg";
  delta?: number;
  className?: string;
}

const MeasurementDisplay: React.FC<MeasurementDisplayProps> = ({
  fieldName,
  value,
  unit,
  previousValue,
  previousDate,
  size = "lg",
  delta,
  className,
}) => {
  const valueSizeClass = {
    sm: "text-[32px]",
    md: "text-[40px]",
    lg: "text-[58px]",
  }[size];

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <span className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
        {fieldName}
      </span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "measurement-value font-semibold text-text-primary leading-none",
            valueSizeClass
          )}
        >
          {value || "—"}
        </span>
        {delta !== undefined && delta !== 0 && (
          <DeltaChip value={delta} />
        )}
      </div>
      <span className="text-sm text-text-tertiary">{unit}</span>
      {previousValue && (
        <span className="text-xs text-text-tertiary mt-1">
          Last time {previousValue} {unit}
          {previousDate && `, ${previousDate}`}
        </span>
      )}
    </div>
  );
};
MeasurementDisplay.displayName = "MeasurementDisplay";

// Compact measurement cell for grids
interface MeasurementCellProps {
  label: string;
  value: string;
  unit: string;
  delta?: number;
  highlighted?: boolean;
  className?: string;
}

const MeasurementCell: React.FC<MeasurementCellProps> = ({
  label,
  value,
  unit,
  delta,
  highlighted,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-3 rounded-[var(--radius-card)]",
        highlighted
          ? "bg-beige-light border border-beige"
          : "bg-white-warm border border-border",
        className
      )}
    >
      <span className="text-xs text-text-tertiary truncate">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold measurement-value text-text-primary">
          {value || "—"}
        </span>
        <span className="text-xs text-text-tertiary">{unit}</span>
        {delta !== undefined && delta !== 0 && (
          <DeltaChip value={delta} className="ml-auto" />
        )}
      </div>
    </div>
  );
};
MeasurementCell.displayName = "MeasurementCell";

export { MeasurementDisplay, MeasurementCell };
