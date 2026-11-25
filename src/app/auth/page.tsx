"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, MailCheck, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { StitchLoader } from "@/components/auth/stitch-loader";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { useBack } from "@/components/ui/page";
import { businessRepo, meRepo } from "@/lib/data/store";
import { clearQueries } from "@/lib/query";
import { setCachedBusiness } from "@/lib/use-business";

type Mode = "signin" | "signup" | "reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="19" viewBox="0 0 384 512" fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 37 59 127.6 107.2 126.1 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-83.5 102.6-120.6-65.2-30.7-61.7-90-61.7-91.4zM255.3 100.6c26.7-31.8 24.3-60.8 23.5-71.2-23.6 1.4-51 16.5-66.5 35-17.1 19.8-27.3 44.4-25.1 70.5 24.1 1.9 46-11.2 68.1-34.3z" />
    </svg>
  );
}

type Provider = "google" | "apple";
const providerName = (p: string | null) => (p === "google" ? "Google" : "Apple");

/**
 * Friendly copy for the `?error=…&code=…&provider=…` Auth.js (and our signIn
 * callback) sends back to /auth when a provider sign-in doesn't complete.
 */
function oauthErrorMessage(error: string | null, code: string | null, provider: string | null): string | null {
  if (!error) return null;
  const name = providerName(provider);
  switch (code) {
    case "email_in_use":
      return `An account with this email already exists. Sign in with your email and password, then connect ${name} in Settings.`;
    case "no_email":
      return `${name} didn't share an email address. Try again and allow Tayylo to see your email (you can still hide it).`;
    case "identity_taken":
      return `This ${name} account is already connected to another Tayylo account.`;
  }
  if (error === "CredentialsSignin") return null; // shown inline by the email form
  if (error === "AccessDenied") return "Sign-in was declined. Please try again.";
  return provider
    ? `${name} sign-in didn't finish. Try again, or use your email and password.`
    : "Sign-in didn't finish. Please try again.";
}

const copy: Record<Mode, { title: string; subtitle: string }> = {
  signin: { title: "Welcome back", subtitle: "Sign in to your workspace." },
  signup: { title: "Create your account", subtitle: "Free to start. Set up your studio in under a minute." },
  reset: { title: "Reset your password", subtitle: "Enter your account email and we'll send you a link to set a new one." },
};

function AuthPageInner() {
  const router = useRouter();
  const goBack = useBack();
  const searchParams = useSearchParams();
  const [mode, setMode] = React.useState<Mode>(searchParams.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [role, setRole] = React.useState<"tailor" | "customer">("tailor");
  const [loading, setLoading] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState<Provider | null>(null);
  const [error, setError] = React.useState<string | null>(() =>
    oauthErrorMessage(searchParams.get("error"), searchParams.get("code"), searchParams.get("provider"))
  );
  const [touched, setTouched] = React.useState({ email: false, password: false });
  const [resetSent, setResetSent] = React.useState(false);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 6;
  const emailError = touched.email && !emailValid ? "Enter a valid email address" : undefined;
  const passwordError =
    touched.password && !passwordValid ? "Use at least 6 characters" : undefined;

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setResetSent(false);
    setTouched({ email: false, password: false });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!emailValid || !passwordValid || loading || oauthLoading) return;
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, role }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error || "Could not create your account");
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("That email and password don't match an account.");
        setLoading(false);
        return;
      }
      clearQueries();
      const me = await meRepo.get();
      if (me?.role === "customer") {
        router.push("/explore");
        return;
      }
      const business = await businessRepo.get();
      setCachedBusiness(business);
      router.push(business ? "/today" : "/onboarding");
    } catch {
      setError("Couldn't reach Tayylo. Check your connection and try again.");
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(t => ({ ...t, email: true }));
    if (!emailValid) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not send the reset email");
      } else {
        setResetSent(true);
      }
    } catch {
      setError("Couldn't reach Tayylo. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: Provider) => {
    // One request at a time: repeated taps would start competing redirects.
    if (oauthLoading || loading) return;
    setError(null);
    setOauthLoading(provider);
    const name = providerName(provider);
    try {
      // Google/Apple are only registered on the server once their credentials
      // are configured; ask Auth.js which providers exist before redirecting.
      const available = await fetch("/api/auth/providers")
        .then(r => (r.ok ? (r.json() as Promise<Record<string, unknown>>) : {}))
        .catch(() => null);
      if (available === null) throw new Error("offline");
      if (!(provider in available)) {
        setError(`${name} sign-in isn't available yet. Use your email and password.`);
        setOauthLoading(null);
        return;
      }
      // Remember the role picked on "Create account" across the redirect. It
      // only applies if this turns out to be a brand-new account.
      const intent = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { role } : {}),
      });
      if (!intent.ok) throw new Error("intent");
      clearQueries();
      // Leaves the page; the spinner stays until the browser navigates.
      await signIn(provider, { callbackUrl: "/today" });
    } catch {
      setError("Couldn't reach Tayylo. Check your connection and try again.");
      setOauthLoading(null);
    }
  };

  const emailField = (
    <Input
      label="Email"
      type="email"
      inputMode="email"
      autoComplete="email"
      placeholder="you@studio.com"
      leadingIcon={<Mail />}
      value={email}
      onChange={e => setEmail(e.target.value)}
      onBlur={() => setTouched(t => ({ ...t, email: true }))}
      error={emailError}
      autoFocus
    />
  );

  return (
    <AuthLayout
      quote="The modern tailor's notebook — every client, measurement and order in one place."
      onBack={() => (mode === "reset" ? switchMode("signin") : goBack("/welcome"))}
      backLabel={mode === "reset" ? "Back to sign in" : "Back"}
    >
      {mode !== "reset" && (
        <SegmentedControl
          ariaLabel="Account"
          block
          className="mb-8"
          value={mode}
          onChange={m => switchMode(m)}
          options={[
            { value: "signin", label: "Sign in" },
            { value: "signup", label: "Create account" },
          ]}
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={mode + String(resetSent)}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {mode === "reset" && resetSent ? (
            <div>
              <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-olive-soft text-olive-deep">
                <MailCheck size={26} strokeWidth={1.75} />
              </div>
              <h1 className="text-title text-ink">Check your inbox</h1>
              <p className="mt-2 text-body text-text-secondary">
                If an account exists for <span className="font-semibold text-ink">{email}</span>, a reset link is on its way. It
                expires after a short while.
              </p>
              <Button size="lg" block className="mt-8" onClick={() => switchMode("signin")}>
                Back to sign in
              </Button>
              <Button variant="ghost" block className="mt-2" onClick={() => setResetSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-title text-ink">{copy[mode].title}</h1>
              <p className="mt-2 text-body text-text-secondary">{copy[mode].subtitle}</p>

              <form onSubmit={mode === "reset" ? handleReset : handleSubmit} noValidate className="mt-8 space-y-5">
                {mode === "signup" && (
                  <div>
                    <p className="mb-2 text-label font-semibold text-ink">I am a…</p>
                    <SegmentedControl
                      ariaLabel="Account type"
                      block
                      value={role}
                      onChange={setRole}
                      options={[
                        { value: "tailor", label: "Tailor" },
                        { value: "customer", label: "Customer" },
                      ]}
                    />
                    <p className="mt-2 text-caption text-text-tertiary">
                      {role === "tailor"
                        ? "Manage clients, measurements, orders, invoices and receipts."
                        : "Browse style inspiration and keep the looks you love."}
                    </p>
                  </div>
                )}
                {emailField}

                {mode !== "reset" && (
                  <Input
                    label="Password"
                    hint={
                      mode === "signin" ? (
                        <button type="button" onClick={() => switchMode("reset")} className="font-semibold text-olive hover:underline">
                          Forgot password?
                        </button>
                      ) : undefined
                    }
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                    leadingIcon={<Lock />}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onBlur={() => setTouched(t => ({ ...t, password: true }))}
                    error={passwordError}
                    helperText={mode === "signup" && !passwordError ? "At least 6 characters" : undefined}
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-sunken hover:text-ink"
                      >
                        {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                      </button>
                    }
                  />
                )}

                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-[var(--radius-input)] bg-danger-bg px-4 py-3 text-label text-danger animate-rise-in">
                    <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button type="submit" size="lg" block disabled={loading} className="h-auto min-h-[52px] py-2 disabled:opacity-100" aria-busy={loading || undefined}>
                  {loading ? (
                    <StitchLoader label={mode === "signin" ? "Stitching you in" : mode === "signup" ? "Tailoring your account" : "Sending your link"} />
                  ) : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
                </Button>
              </form>

              {mode === "reset" ? (
                <p className="mt-6 text-center text-label text-text-tertiary">
                  Remembered it?{" "}
                  <button onClick={() => switchMode("signin")} className="font-semibold text-ink hover:underline">
                    Back to sign in
                  </button>
                </p>
              ) : (
                <>
                  <div className="my-6 flex items-center gap-3 text-caption text-text-tertiary">
                    <span className="h-px flex-1 bg-border" />
                    or continue with
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid gap-3">
                    {/* Sign in with Apple: black with the white Apple logo and an
                        approved title, at least as prominent as other options
                        (Apple Human Interface Guidelines). */}
                    <Button
                      size="lg"
                      block
                      loading={oauthLoading === "apple"}
                      disabled={!!oauthLoading || loading}
                      onClick={() => handleOAuth("apple")}
                      className="bg-black text-white shadow-none hover:bg-[#1d1d1f] focus-visible:outline-black disabled:opacity-60 [font-family:-apple-system,BlinkMacSystemFont,'Helvetica_Neue',Helvetica,Arial,sans-serif]"
                    >
                      <AppleIcon />
                      Continue with Apple
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      block
                      loading={oauthLoading === "google"}
                      disabled={!!oauthLoading || loading}
                      onClick={() => handleOAuth("google")}
                    >
                      <GoogleIcon />
                      Continue with Google
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </AuthLayout>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-canvas" />}>
      <AuthPageInner />
    </Suspense>
  );
}
