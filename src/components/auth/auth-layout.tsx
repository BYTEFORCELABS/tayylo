"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/**
 * Shared frame for sign-in, sign-up, password reset and onboarding.
 * Phones: a single calm column. Desktop: form left, atelier photo right.
 */
export function AuthLayout({
  children,
  image = "/pictures/suittailorimage.jpg",
  quote,
  top,
  onBack,
  backLabel = "Back",
}: {
  children: React.ReactNode;
  image?: string;
  quote?: string;
  /** Replaces the logo row (e.g. onboarding progress). */
  top?: React.ReactNode;
  /** Kept so existing callers compile; auth screens no longer show a back button. */
  onBack?: () => void;
  backLabel?: string;
}) {
  void onBack;
  void backLabel;
  return (
    <div className="min-h-[100dvh] bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-[100dvh] flex-col px-6 pt-safe sm:px-10">
        <div className="mx-auto flex h-20 w-full max-w-[400px] items-center justify-center">
          {top ?? (
            <Link href="/welcome" aria-label="Tayylo">
              <Logo height={26} priority />
            </Link>
          )}
        </div>
        {/* A tailor's tape: quiet ruler ticks that tie the screen to the craft. */}
        {!top && (
          <div aria-hidden className="mx-auto w-full max-w-[400px] lg:hidden">
            <div
              className="h-2.5 w-full text-olive/35"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, currentColor 0 1.5px, transparent 1.5px 40px)",
                backgroundSize: "100% 40%, 100% 100%",
                backgroundPosition: "0 0, 0 0",
                backgroundRepeat: "no-repeat",
                maskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)",
                WebkitMaskImage: "linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent)",
              }}
            />
          </div>
        )}
        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col pb-[max(24px,env(safe-area-inset-bottom))] pt-4 lg:justify-center lg:pt-0">
          {children}
        </main>
      </div>

      <div className="relative hidden p-4 lg:block">
        <div className="sticky top-4 h-[calc(100dvh-32px)] overflow-hidden rounded-[var(--radius-panel)] bg-panel">
          {/* eslint-disable-next-line @next/next/no-img-element -- static brand photography */}
          <img src={image} alt="" className="absolute inset-0 size-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-10">
            <Logo tone="cream" height={28} />
            {quote && <p className="mt-5 max-w-sm text-[22px] font-medium leading-snug tracking-tight text-text-inverse">{quote}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
