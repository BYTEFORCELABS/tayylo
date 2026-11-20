import React from "react";

/**
 * Brand loading state for auth buttons: a needle pulls a dashed thread
 * across the button — a tailor "stitching you in" — instead of a spinner.
 */
export function StitchLoader({ label }: { label: string }) {
  return (
    <span className="flex w-full flex-col items-center gap-1.5 px-10" role="status" aria-live="polite">
      <span className="text-[15px] font-semibold">{label}</span>
      <span className="stitch-track" aria-hidden>
        <span className="stitch-thread" />
        <span className="stitch-needle">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <line x1="3" y1="19" x2="19" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="17.2" cy="4.8" r="1.4" fill="var(--color-olive)" />
          </svg>
        </span>
      </span>
    </span>
  );
}
