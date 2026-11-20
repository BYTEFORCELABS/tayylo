import React from "react";
import { SvgXml } from "react-native-svg";
import { getGarmentIcon } from "./garmentIcons";

type Props = {
  /** Garment id or label, e.g. "agbada", "Iro & Buba", "two-piece-suit" */
  garment: string;
  size?: number;
  color?: string;
};

/** React Native / Expo icon. Requires `npx expo install react-native-svg`. */
export function GarmentIcon({ garment, size = 32, color = "#3B3631" }: Props) {
  const icon = getGarmentIcon(garment);
  return (
    <SvgXml
      xml={icon.svg}
      width={size}
      height={size}
      color={color}
      accessibilityLabel={icon.name}
    />
  );
}
