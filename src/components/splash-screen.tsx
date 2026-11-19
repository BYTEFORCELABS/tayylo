"use client";

import React from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "motion/react";
import animationData from "../../public/tayylo-logo-lottie-pack/tayylo-lockup-cream.json";

const Lottie = dynamic(() => import("lottie-react").then(mod => mod.Lottie), { ssr: false });

const SEEN_KEY = "tayylo-splash-seen";
const SAFETY_TIMEOUT_MS = 4000;
const EXIT_DURATION_MS = 450;

type Phase = "checking" | "playing" | "exiting" | "done";

export function SplashScreen({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = React.useState<Phase>("checking");

  // "checking" renders no overlay on both server and first client render,
  // so there's nothing for hydration to mismatch - the splash only ever
  // appears after we've confirmed (client-side) that it hasn't run yet
  // this session. The sessionStorage read is deferred a tick so the
  // resulting setState lands outside this effect's own commit.
  React.useEffect(() => {
    const id = setTimeout(() => {
      try {
        if (sessionStorage.getItem(SEEN_KEY)) {
          setPhase("done");
          return;
        }
      } catch {
        // sessionStorage unavailable (private mode, etc.) - just play once.
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
      } catch {
        // ignore
      }
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
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: EXIT_DURATION_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
            onClick={finish}
            role="presentation"
            className="fixed inset-0 z-[9999] bg-olive-deep flex items-center justify-center"
          >
            <div className="w-[58vw] max-w-[240px]">
              <Lottie src={animationData} loop={false} autoplay subscriptions={{ complete: finish }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
