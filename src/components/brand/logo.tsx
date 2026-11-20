import Image from "next/image";
import { cn } from "@/lib/utils";

// The only way the Tayylo mark is placed in the UI. Ratios come from the
// supplied artwork (lockup 1872×450, symbol 630×450) so it can never be
// stretched. Olive on light surfaces, cream on dark ones.

const LOCKUP_RATIO = 1872 / 450;
const SYMBOL_RATIO = 630 / 450;

interface LogoProps {
  variant?: "lockup" | "symbol";
  tone?: "olive" | "cream";
  /** Rendered height in px; width follows the artwork's ratio. */
  height?: number;
  priority?: boolean;
  className?: string;
}

export function Logo({ variant = "lockup", tone = "olive", height = 28, priority, className }: LogoProps) {
  const ratio = variant === "lockup" ? LOCKUP_RATIO : SYMBOL_RATIO;
  const src = `/${variant}_${tone}.png`;
  return (
    <Image
      src={src}
      alt="Tayylo"
      width={Math.round(height * ratio)}
      height={height}
      priority={priority}
      className={cn("shrink-0 select-none", className)}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}
