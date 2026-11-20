import React from "react";
import { getGarmentIcon } from "./garmentIcons";

type Props = {
  garment: string;
  size?: number;
  color?: string;
  className?: string;
};

/** React DOM icon. The SVG markup comes from this package's own files, not user input. */
export function GarmentIcon({ garment, size = 32, color = "#3B3631", className }: Props) {
  const icon = getGarmentIcon(garment);
  return (
    <span
      role="img"
      aria-label={icon.name}
      className={className}
      style={{ display: "inline-flex", width: size, height: size, color }}
      dangerouslySetInnerHTML={{ __html: icon.svg.replace("<svg ", `<svg width="${size}" height="${size}" `) }}
    />
  );
}
