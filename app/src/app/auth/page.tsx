"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Phone, Mail } from "lucide-react";

type AuthStep = "method" | "phone" | "otp";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<AuthStep>("method");
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const otpRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handlePhoneSubmit = () => {
    if (phone.length >= 6) {
      setStep("otp");
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otp];
    newOtp[index] = val.slice(-1);
    setOtp(newOtp);
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all filled
    if (newOtp.every(d => d) && index === 5) {
      setLoading(true);
      setTimeout(() => router.push("/onboarding"), 1200);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleSocialLogin = () => {
    setLoading(true);
    setTimeout(() => router.push("/onboarding"), 1000);
  };

  const handleResend = () => {
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 pt-safe">
        <button
          onClick={() => {
            if (step === "otp") setStep("phone");
            else if (step === "phone") setStep("method");
            else router.push("/welcome");
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors text-text-primary"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8 max-w-sm mx-auto w-full my-auto">
        <div className="flex justify-center mb-6">
          <Image src="/symbol_olive.png" alt="Tayylo" width={44} height={44} />
        </div>

        <AnimatePresence mode="wait">
          {step === "method" && (
            <motion.div
              key="method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h1 className="font-serif text-2xl text-text-primary text-center mb-2">
                Sign in to Tayylo
              </h1>
              <p className="text-sm text-text-secondary text-center mb-8 max-w-xs">
                Choose how you&apos;d like to sign in or create your account.
              </p>

              <div className="w-full max-w-sm space-y-3">
                <button
                  onClick={() => setStep("phone")}
                  className="flex items-center gap-3 w-full h-12 px-4 rounded-[var(--radius-button)] bg-olive text-white-warm font-medium text-sm hover:bg-olive-deep transition-colors active:scale-[0.98]"
                >
                  <Phone size={18} strokeWidth={1.5} />
                  Continue with phone
                </button>

                <button
                  onClick={handleSocialLogin}
                  className="flex items-center gap-3 w-full h-12 px-4 rounded-[var(--radius-button)] bg-white-warm border border-border text-text-primary font-medium text-sm hover:bg-beige-light transition-colors active:scale-[0.98]"
                >
                  <Mail size={18} strokeWidth={1.5} />
                  Continue with email
                </button>

                <button
                  onClick={handleSocialLogin}
                  className="flex items-center gap-3 w-full h-12 px-4 rounded-[var(--radius-button)] bg-white-warm border border-border text-text-primary font-medium text-sm hover:bg-beige-light transition-colors active:scale-[0.98]"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                  </svg>
                  Continue with Google
                </button>

                <button
                  onClick={handleSocialLogin}
                  className="flex items-center gap-3 w-full h-12 px-4 rounded-[var(--radius-button)] bg-text-primary text-white-warm font-medium text-sm hover:opacity-90 transition-colors active:scale-[0.98]"
                >
                  <svg width="16" height="18" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 37 59 127.6 107.2 126.1 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-83.5 102.6-120.6-65.2-30.7-61.7-90-61.7-91.4zM255.3 100.6c26.7-31.8 24.3-60.8 23.5-71.2-23.6 1.4-51 16.5-66.5 35-17.1 19.8-27.3 44.4-25.1 70.5 24.1 1.9 46-11.2 68.1-34.3z"/>
                  </svg>
                  Continue with Apple
                </button>
              </div>
            </motion.div>
          )}

          {step === "phone" && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h1 className="font-serif text-2xl text-text-primary text-center mb-2">
                Enter your phone number
              </h1>
              <p className="text-sm text-text-secondary text-center mb-8 max-w-xs">
                We&apos;ll send you a verification code.
              </p>

              <div className="w-full max-w-sm space-y-4">
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full h-12 px-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-cream"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handlePhoneSubmit}
                  disabled={phone.length < 6}
                  className="w-full h-12 rounded-[var(--radius-button)] bg-olive text-white-warm font-medium text-sm hover:bg-olive-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  Send code
                </button>
              </div>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <h1 className="font-serif text-2xl text-text-primary text-center mb-2">
                Enter verification code
              </h1>
              <p className="text-sm text-text-secondary text-center mb-8 max-w-xs">
                We sent a 6-digit code to {phone}
              </p>

              <div className="flex gap-2 mb-6">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-12 h-14 rounded-[var(--radius-input)] border border-border bg-white-warm text-center text-xl font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-olive focus:ring-offset-2 focus:ring-offset-cream"
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {loading && (
                <div className="flex items-center gap-2 text-sm text-olive mb-4">
                  <div className="w-4 h-4 border-2 border-olive border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </div>
              )}

              <div className="flex flex-col items-center gap-2 text-sm">
                {resent ? (
                  <p className="text-success">Code resent</p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="text-olive hover:underline"
                  >
                    Resend code
                  </button>
                )}
                <button
                  onClick={() => setStep("phone")}
                  className="text-text-tertiary hover:text-text-secondary"
                >
                  Wrong number?
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
