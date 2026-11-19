"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type PanInfo } from "motion/react";

interface Slide {
  image: string;
  headline: string;
  caption: string;
}

const slides: Slide[] = [
  {
    image: "/pictures/tailorwithtablet.jpg",
    headline: "Find any client in two seconds",
    caption: "Every measurement, order, and fitting note, searchable the instant they call.",
  },
  {
    image: "/pictures/tailorpic2.jpg",
    headline: "Record measurements at the speed of a tape",
    caption: "A keypad built for tailor fractions, so capturing a fitting feels as fast as taking one.",
  },
  {
    image: "/pictures/suittailorimage.jpg",
    headline: "Keep every measurement as a dated version",
    caption: "Nothing gets overwritten. See exactly how a client's fit has changed, visit to visit.",
  },
];

const AUTO_ADVANCE_MS = 5000;

export default function WelcomePage() {
  const router = useRouter();
  const [index, setIndex] = React.useState(0);
  const isLastSlide = index === slides.length - 1;

  React.useEffect(() => {
    if (isLastSlide) return;
    const timer = setTimeout(() => setIndex(i => Math.min(i + 1, slides.length - 1)), AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, isLastSlide]);

  const goTo = (i: number) => setIndex(Math.max(0, Math.min(slides.length - 1, i)));

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goTo(index + 1);
    else if (info.offset.x > threshold) goTo(index - 1);
  };

  const slide = slides[index];

  return (
    <div className="min-h-[100dvh] bg-olive-deep flex flex-col overflow-hidden">
      {/* Photo area */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.image}
            drag="x"
            dragElastic={0.2}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            <img
              src={slide.image}
              alt=""
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
            {/* Scrim so logo + text stay legible over any photo */}
            <div className="absolute inset-0 bg-gradient-to-b from-olive-deep/80 via-olive-deep/10 to-olive-deep" />
          </motion.div>
        </AnimatePresence>

        <div
          className="relative z-10 flex items-center justify-center"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 2.5rem)" }}
        >
          <Image src="/lockup_cream.png" alt="Tayylo" width={160} height={40} priority />
        </div>
      </div>

      {/* Copy + controls */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-safe pb-8 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center max-w-xs"
          >
            <p className="font-serif text-beige text-xl mb-2 leading-snug">
              {slide.headline}
            </p>
            <p className="text-beige/60 text-sm mb-6">{slide.caption}</p>
          </motion.div>
        </AnimatePresence>

        {/* Segmented progress: the active segment fills as the slide auto-advances */}
        <div className="flex items-center gap-2 mb-7 w-full max-w-xs" role="tablist" aria-label="Slides">
          {slides.map((s, i) => {
            const done = i < index || (i === index && isLastSlide);
            return (
              <button
                key={s.image}
                role="tab"
                aria-selected={i === index}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="relative flex-1 h-6 flex items-center group"
              >
                <span className="relative block w-full h-[3px] rounded-full bg-beige/20 overflow-hidden group-hover:bg-beige/30 transition-colors">
                  {done ? (
                    <span className="absolute inset-0 bg-beige rounded-full" />
                  ) : i === index ? (
                    <motion.span
                      key={index}
                      className="absolute inset-y-0 left-0 bg-beige rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {isLastSlide ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-full max-w-xs"
          >
            <button
              onClick={() => router.push("/auth?mode=signup")}
              className="w-full h-12 rounded-[var(--radius-button)] bg-[#FFFDF8] text-[#30371F] font-semibold text-base hover:bg-[#F5F1E8] transition-colors active:scale-[0.98] shadow-md"
            >
              Get started
            </button>

            <p className="text-beige/40 text-xs mt-4 text-center">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/auth?mode=signin")}
                className="text-beige underline underline-offset-2"
              >
                Sign in
              </button>
            </p>
          </motion.div>
        ) : (
          <div className="w-full max-w-xs flex items-center gap-3">
            <button
              onClick={() => goTo(slides.length - 1)}
              className="h-12 px-6 rounded-[var(--radius-button)] border border-beige/25 text-beige/80 font-semibold text-base hover:bg-white/5 hover:text-beige transition-colors active:scale-[0.98]"
            >
              Skip
            </button>
            <button
              onClick={() => goTo(index + 1)}
              className="flex-1 h-12 rounded-[var(--radius-button)] bg-[#FFFDF8] text-[#30371F] font-semibold text-base hover:bg-[#F5F1E8] transition-colors active:scale-[0.98] shadow-md"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
