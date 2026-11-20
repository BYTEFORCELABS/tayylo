import React from "react";
import { SvgXml } from "react-native-svg";
import { getMeasurementIcon } from "./measurementRegistry";

type Props = {
  /** Measurement id or label, e.g. "bust", "Under Bust", "inseam" */
  measurement: string;
  size?: number;
  /** Body outline colour (currentColor). */
  color?: string;
  /** Measurement indicator colour. */
  accent?: string;
};

export function MeasurementIcon({ measurement, size = 40, color = "#3B3631", accent }: Props) {
  const icon = getMeasurementIcon(measurement, { accent });
  if (!icon) return null;
  return <SvgXml xml={icon.svg} width={size} height={size} color={color} accessibilityLabel={icon.name} />;
}
