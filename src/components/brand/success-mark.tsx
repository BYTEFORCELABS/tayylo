"use client";

// Tayylo's "done" mark: an olive seal with a stitched ring sewn around it
// and a cream tick drawn in, like a finished hem. Animated for big moments
// (saved, password updated); static at small sizes (toasts, list rows).

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface SuccessMarkProps {
  /** Rendered size in px. */
  size?: number;
  /** Plays the sewing + tick animation once on mount. */
  animated?: boolean;
  className?: string;
  label?: string;
  /** `light` for dark surfaces (toasts on ink). */
  tone?: "olive" | "light";
}

const OLIVE = "#454F2C";
const OLIVE_DEEP = "#2E3420";
const CREAM = "#F3EFE3";

export function SuccessMark({ size = 64, animated = true, className, label, tone = "olive" }: SuccessMarkProps) {
  const light = tone === "light";
  const mark = light ? "#1E2019" : CREAM;
  const gradId = light ? "sm-dome-light" : "sm-dome";
  const reduce = useReducedMotion();
  const play = animated && !reduce;
  // Below ~28px the stitches turn to noise, so small marks use a solid ring.
  const small = size < 28;

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {/* Soft halo that breathes out once */}
      {play && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: OLIVE }}
          initial={{ scale: 0.6, opacity: 0.35 }}
          animate={{ scale: 1.7, opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
        />
      )}

      <motion.svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative"
        initial={play ? { scale: 0.5, rotate: -20, opacity: 0 } : false}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 22 }}
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="22%" r="80%">
            <stop offset="0%" stopColor={light ? "#DCE5BF" : "#5C6A3B"} />
            <stop offset="60%" stopColor={light ? "#B7C49A" : OLIVE} />
            <stop offset="100%" stopColor={light ? "#93A26E" : OLIVE_DEEP} />
          </radialGradient>
        </defs>

        {/* Seal */}
        <circle cx="32" cy="32" r="31" fill={`url(#${gradId})`} />
        <circle cx="32" cy="32" r="30.5" fill="none" stroke="#fff" strokeOpacity="0.14" />

        {/* Stitched ring, sewn round from the top: the dashes are revealed by
            an animated mask so the stitch pattern survives the draw-on. */}
        <mask id={`${gradId}-sew`}>
          <motion.circle
            cx="32"
            cy="32"
            r="24.5"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            transform="rotate(-90 32 32)"
            initial={play ? { pathLength: 0 } : false}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          />
        </mask>
        <circle
          cx="32"
          cy="32"
          r="24.5"
          fill="none"
          stroke={mark}
          strokeOpacity={small ? 0.5 : 0.75}
          strokeWidth={small ? 2 : 1.6}
          strokeLinecap="round"
          strokeDasharray={small ? undefined : "3.2 3.4"}
          mask={`url(#${gradId}-sew)`}
        />

        {/* Tick */}
        <motion.path
          d="M21 33.5l7.5 7.5L44 25.5"
          fill="none"
          stroke={mark}
          strokeWidth={small ? 5.5 : 4.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={play ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.38, delay: play ? 0.42 : 0, ease: [0.65, 0, 0.35, 1] }}
        />
      </motion.svg>

      {/* Thread sparks */}
      {play &&
        Array.from({ length: 6 }).map((_, i) => {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const r = size * 0.72;
          return (
            <motion.span
              key={i}
              className="absolute left-1/2 top-1/2 h-[2px] w-[7px] rounded-full"
              style={{ background: OLIVE, rotate: `${(a * 180) / Math.PI}deg` }}
              initial={{ x: "-50%", y: "-50%", opacity: 0 }}
              animate={{
                x: `calc(-50% + ${Math.cos(a) * r}px)`,
                y: `calc(-50% + ${Math.sin(a) * r}px)`,
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 0.6, delay: 0.7, ease: "easeOut" }}
            />
          );
        })}
    </span>
  );
}
