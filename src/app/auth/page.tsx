"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { businessRepo } from "@/lib/data/store";

type Mode = "signin" | "signup" | "reset";

const pageVariants = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, staggerChildren: 0.06, delayChildren: 0.04 },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 37 59 127.6 107.2 126.1 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-83.5 102.6-120.6-65.2-30.7-61.7-90-61.7-91.4zM255.3 100.6c26.7-31.8 24.3-60.8 23.5-71.2-23.6 1.4-51 16.5-66.5 35-17.1 19.8-27.3 44.4-25.1 70.5 24.1 1.9 46-11.2 68.1-34.3z"/>
    </svg>
  );
}

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: Mode = searchParams.get("mode") === "signup" ? "signup" : "signin";

  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [resetSending, setResetSending] = React.useState(false);
  const [resetSent, setResetSent] = React.useState(false);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !loading;

  const goToAppropriateScreen = React.useCallback(async () => {
    const business = await businessRepo.get();
    router.push(business ? "/today" : "/onboarding");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    if (mode === "signup") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setLoading(false);
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not create your account");
        return;
      }
      // No email confirmation gate — sign in immediately with the same credentials.
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Incorrect email or password");
      return;
    }
    await goToAppropriateScreen();
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    await signIn(provider, { callbackUrl: "/today" });
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().length < 4) return;
    setError(null);
    setResetSending(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    setResetSending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not send the reset email");
    } else {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col">
      {/* Hero */}
      <div className="relative h-[22dvh] min-h-[130px] shrink-0 overflow-hidden">
        <motion.img
          src="/pictures/suittailorimage.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.04 }}
          animate={{ scale: 1.14 }}
          transition={{ duration: 24, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-olive-deep/75 via-olive-deep/85 to-olive-deep" />

        <div className="relative z-10 flex-1 h-full flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden"
          >
            <Image src="/lockup_cream.png" alt="Tayylo" width={150} height={38} priority />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.6) 50%, transparent 65%)",
                mixBlendMode: "overlay",
              }}
              initial={{ x: "-130%" }}
              animate={{ x: "130%" }}
              transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.4, delay: 1.1 }}
            />
          </motion.div>
        </div>
      </div>

      {/* Sheet */}
      <div className="flex-1 bg-white-warm rounded-t-[32px] -mt-6 relative z-10 shadow-[0_-12px_28px_rgba(0,0,0,0.07)]">
        <div className="max-w-sm mx-auto w-full px-6 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <motion.h1 variants={itemVariants} className="font-serif text-3xl font-bold text-text-primary mb-1">
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
              </motion.h1>
              <motion.p variants={itemVariants} className="text-base text-text-secondary mb-5">
                {mode === "signin"
                  ? "Sign in to continue your atelier"
                  : mode === "signup"
                    ? "Set a password to sign in from now on"
                    : resetSent
                      ? "Check your inbox for the reset link"
                      : "Enter your account email and we'll send you a reset link"}
              </motion.p>

              {mode === "reset" ? (
                resetSent ? (
                  <motion.div variants={itemVariants} className="space-y-5">
                    <div className="flex items-start gap-3 bg-olive/10 text-olive rounded-[var(--radius-input)] px-4 py-3.5">
                      <CheckCircle2 size={22} strokeWidth={1.75} className="shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed text-text-primary">
                        We sent a password reset link to <strong>{email}</strong>. Click it to set a
                        new password.
                      </p>
                    </div>
                    <button
                      onClick={() => setMode("signin")}
                      className="w-full h-12 rounded-[var(--radius-button)] bg-gradient-to-r from-olive-deep to-olive text-white-warm font-semibold text-base hover:brightness-110 transition-all active:scale-[0.98] shadow-sm"
                    >
                      Back to sign in
                    </button>
                  </motion.div>
                ) : (
                  <motion.form variants={itemVariants} onSubmit={handleSendReset} className="space-y-3.5">
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-1.5">Email</label>
                      <div className="relative">
                        <Mail
                          size={19}
                          strokeWidth={1.5}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                        />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          autoComplete="email"
                          className="w-full h-12 pl-11 pr-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-white-warm"
                          autoFocus
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-danger bg-danger-bg rounded-[var(--radius-input)] px-3.5 py-2.5">
                        {error}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={resetSending || email.trim().length < 4}
                      className="w-full h-12 rounded-[var(--radius-button)] bg-gradient-to-r from-olive-deep to-olive text-white-warm font-semibold text-base hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                    >
                      {resetSending ? "Sending..." : "Send reset link"}
                    </button>

                    <p className="text-text-secondary text-base text-center pt-2">
                      Remembered it?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setMode("signin");
                        }}
                        className="text-olive font-semibold hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </motion.form>
                )
              ) : (
                <>
              <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">Email</label>
                  <div className="relative">
                    <Mail
                      size={19}
                      strokeWidth={1.5}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                      className="w-full h-12 pl-11 pr-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-white-warm"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">Password</label>
                  <div className="relative">
                    <Lock
                      size={19}
                      strokeWidth={1.5}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="w-full h-12 pl-11 pr-11 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-white-warm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={19} strokeWidth={1.5} /> : <Eye size={19} strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {mode === "signin" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded accent-olive"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setResetSent(false);
                        setMode("reset");
                      }}
                      className="text-sm font-semibold text-olive hover:underline"
                    >
                      Forgot password
                    </button>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-danger bg-danger-bg rounded-[var(--radius-input)] px-3.5 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full h-12 rounded-[var(--radius-button)] bg-gradient-to-r from-olive-deep to-olive text-white-warm font-semibold text-base hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm"
                >
                  {loading
                    ? mode === "signin" ? "Signing in..." : "Creating account..."
                    : mode === "signin" ? "Log In" : "Create account"}
                </button>
              </motion.form>

              <motion.div variants={itemVariants} className="flex items-center gap-3 my-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-text-tertiary">Or</span>
                <div className="h-px flex-1 bg-border" />
              </motion.div>

              <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleOAuth("google")}
                  className="flex items-center justify-center gap-2 h-11 rounded-[var(--radius-button)] border border-border bg-white-warm text-sm font-medium text-text-primary hover:bg-beige-light transition-colors active:scale-[0.98]"
                >
                  <GoogleIcon />
                  Google
                </button>
                <button
                  onClick={() => handleOAuth("apple")}
                  className="flex items-center justify-center gap-2 h-11 rounded-[var(--radius-button)] border border-border bg-white-warm text-sm font-medium text-text-primary hover:bg-beige-light transition-colors active:scale-[0.98]"
                >
                  <AppleIcon />
                  Apple
                </button>
              </motion.div>

              <motion.p variants={itemVariants} className="text-text-secondary text-base text-center mt-5">
                {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setError(null);
                    setMode(mode === "signin" ? "signup" : "signin");
                  }}
                  className="text-olive font-semibold hover:underline"
                >
                  {mode === "signin" ? "Create Account" : "Sign in"}
                </button>
              </motion.p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <AuthPageInner />
    </Suspense>
  );
}
