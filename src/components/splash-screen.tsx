"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import animationData from "../../public/tayylo-logo-lottie-pack/tayylo-lockup-cream.json";

const Lottie = dynamic(() => import("lottie-react").then(mod => mod.Lottie), { ssr: false });

const SEEN_KEY = "tayylo-splash-seen";
/** Hard ceiling — the brand reveal never holds the user longer than this. */
const SAFETY_TIMEOUT_MS = 2600;
const EXIT_DURATION_MS = 380;

type Phase = "checking" | "playing" | "exiting" | "done";

/**
 * Plays the lockup reveal once per browser session over deep olive, then
 * dissolves into the app. Never renders on the server, so it can't cause a
 * hydration flash; tapping skips it; reduced-motion users skip it entirely.
 */
export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("checking");

  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce || sessionStorage.getItem(SEEN_KEY)) {
          setPhase("done");
          return;
        }
      } catch {
        // sessionStorage unavailable — just play once.
      }
      setPhase("playing");
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const finish = React.useCallback(() => {
    setPhase(current => (current === "playing" ? "exiting" : current));
  }, []);

  React.useEffect(() => {
    if (phase !== "exiting") return;
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      setPhase("done");
    }, EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [phase]);

  React.useEffect(() => {
    if (phase !== "playing") return;
    const t = setTimeout(finish, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, finish]);

  return (
    <>
      {children}
      <AnimatePresence>
        {(phase === "playing" || phase === "exiting") && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: EXIT_DURATION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            onClick={finish}
            role="presentation"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-panel"
          >
            <motion.div
              className="w-[52vw] max-w-[220px]"
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Lottie src={animationData} loop={false} autoplay subscriptions={{ complete: finish }} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
