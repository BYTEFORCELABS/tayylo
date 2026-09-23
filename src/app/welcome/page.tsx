"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function WelcomePage() {
  const router = useRouter();
  const [showContent, setShowContent] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-olive-deep flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #D8CBB5 1px, transparent 0)`,
        backgroundSize: "32px 32px",
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center relative z-10"
      >
        {/* Logo lockup (symbol + wordmark) */}
        <Image
          src="/lockup_cream.png"
          alt="Tayylo"
          width={220}
          height={55}
          priority
          className="mb-8"
        />
      </motion.div>

      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center relative z-10 mt-4"
        >
          <p className="font-serif text-beige text-center text-lg mb-2 max-w-xs leading-relaxed">
            The modern tailor&apos;s notebook
          </p>
          <p className="text-beige/60 text-center text-sm max-w-xs mb-10">
            Find any client in two seconds. Record measurements at the speed of a tape. Keep every measurement as a dated version.
          </p>

          <button
            onClick={() => router.push("/auth")}
            className="w-full max-w-xs h-12 rounded-[var(--radius-button)] bg-[#FFFDF8] text-[#30371F] font-semibold text-base hover:bg-[#F5F1E8] transition-colors active:scale-[0.98] shadow-md"
          >
            Get started
          </button>

          <p className="text-beige/40 text-xs mt-6">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/auth")}
              className="text-beige underline underline-offset-2"
            >
              Sign in
            </button>
          </p>
        </motion.div>
      )}
    </div>
  );
}
