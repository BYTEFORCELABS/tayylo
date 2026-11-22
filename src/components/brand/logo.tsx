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
  /**
   * Plain <img> with fixed pixel size and the original file as its source,
   * not the Next image optimiser. Use for anything captured to an image
   * (html-to-image can't follow the optimiser's srcset or URL).
   */
  plain?: boolean;
}

export function Logo({ variant = "lockup", tone = "olive", height = 28, priority, className, plain }: LogoProps) {
  const ratio = variant === "lockup" ? LOCKUP_RATIO : SYMBOL_RATIO;
  const src = `/${variant}_${tone}.png`;
  if (plain) {
    const width = Math.round(height * ratio * 100) / 100;
    return (
      // eslint-disable-next-line @next/next/no-img-element -- must stay a plain file URL so image export can embed it
      <img
        src={src}
        alt="Tayylo"
        width={width}
        height={height}
        loading="eager"
        decoding="sync"
        draggable={false}
        className={cn("block shrink-0 select-none", className)}
        style={{ width, height, minWidth: width, maxWidth: "none", objectFit: "contain" }}
      />
    );
  }
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
