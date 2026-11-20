"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type PanInfo } from "motion/react";
import { useSession } from "next-auth/react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

interface Slide {
  image: string;
  headline: string;
  caption: string;
}

const slides: Slide[] = [
  {
    image: "/pictures/tailorwithtablet.jpg",
    headline: "Find any client in two seconds",
    caption: "Every measurement, order and fitting note — searchable the moment they call.",
  },
  {
    image: "/pictures/tailorpic2.jpg",
    headline: "Measure at the speed of a tape",
    caption: "A keypad built for tailor fractions, so recording a fitting is as fast as taking one.",
  },
  {
    image: "/pictures/suittailorimage.jpg",
    headline: "Every measurement, kept as a dated version",
    caption: "Nothing is overwritten. See exactly how a client's fit has changed, visit to visit.",
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function WelcomePage() {
  const router = useRouter();
  const { status } = useSession();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const isLast = index === slides.length - 1;

  React.useEffect(() => {
    if (isLast || paused) return;
    const t = setTimeout(() => setIndex(i => Math.min(i + 1, slides.length - 1)), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, isLast, paused]);

  // Returning, signed-in users go straight to their workspace.
  React.useEffect(() => {
    if (status === "authenticated") router.replace("/today");
  }, [status, router]);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60) goTo(index + 1);
    else if (info.offset.x > 60) goTo(index - 1);
  };

  const slide = slides[index];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-canvas lg:flex-row">
      {/* Photo */}
      <div className="relative flex flex-1 flex-col p-3 pt-[max(12px,env(safe-area-inset-top))] lg:p-4">
        <div className="relative min-h-[46dvh] flex-1 overflow-hidden rounded-[var(--radius-panel)] bg-panel">
          <AnimatePresence initial={false}>
            <motion.div
              key={slide.image}
              drag="x"
              dragElastic={0.15}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={onDragEnd}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand photography */}
              <img src={slide.image} alt="" draggable={false} className="size-full select-none object-cover" />
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-panel/70 via-transparent to-transparent" />
          <div className="pointer-events-none absolute left-6 top-6">
            <Logo tone="cream" height={26} priority />
          </div>
        </div>
      </div>

      {/* Copy and actions */}
      <div className="flex flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:px-10 lg:w-[480px] lg:justify-center lg:pb-12">
        <div
          className="mx-auto w-full max-w-[400px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div role="tablist" aria-label="Introduction" className="mb-6 flex gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.image}
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1} of ${slides.length}`}
                onClick={() => goTo(i)}
                className="group flex h-6 flex-1 items-center"
              >
                <span className="relative block h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
                  {i < index || (i === index && (isLast || paused)) ? (
                    <span className="absolute inset-0 rounded-full bg-ink" />
                  ) : i === index ? (
                    <motion.span
                      key={index}
                      className="absolute inset-y-0 left-0 rounded-full bg-ink"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                </span>
              </button>
            ))}
          </div>

          <div className="min-h-[148px]" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-[30px] font-semibold leading-[1.1] tracking-tight text-ink">{slide.headline}</h1>
                <p className="mt-3 text-body text-text-secondary">{slide.caption}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-6 space-y-3">
            {isLast ? (
              <Button size="lg" block onClick={() => router.push("/auth?mode=signup")}>
                Get started
              </Button>
            ) : (
              <div className="flex gap-2.5">
                <Button
                  size="lg"
                  variant="ghost"
                  className="flex-1 border-2 border-olive text-olive-deep hover:bg-olive-soft/60"
                  onClick={() => goTo(slides.length - 1)}
                >
                  Skip
                </Button>
                <Button size="lg" className="flex-1" onClick={() => goTo(index + 1)}>
                  Next
                </Button>
              </div>
            )}
            <p className="text-center text-label text-text-tertiary">
              Already have an account?{" "}
              <button onClick={() => router.push("/auth?mode=signin")} className="font-semibold text-ink underline-offset-4 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
