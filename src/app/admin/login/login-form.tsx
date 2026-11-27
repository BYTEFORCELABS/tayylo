"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { ArrowLeft, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Two steps: email → a 6-digit code sent to that email. No passwords. */
export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [email, setEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/login-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't send the code");
      setStep("code");
      setCode("");
      setNotice(`If ${email.trim()} has admin access, a 6-digit code is on its way. Check your inbox and spam folder.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("admin-code", { email, code, redirect: false });
    if (result?.error) {
      setError("That code is wrong or has expired. Check the latest email, or send a new code.");
      setLoading(false);
      return;
    }
    // A valid code only exists for staff, but double-check before entering.
    const check = await fetch("/api/admin/settings");
    if (!check.ok) {
      await signOut({ redirect: false });
      setError("This account doesn't have admin access.");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-panel)] border border-border/70 bg-surface p-8">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo height={24} priority />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-text-inverse">Admin</span>
        </div>

        {step === "email" ? (
          <form onSubmit={sendCode}>
            <h1 className="text-title text-ink">Staff sign-in</h1>
            <p className="mt-1.5 text-label text-text-secondary">We&rsquo;ll email you a one-time code.</p>
            <div className="mt-6">
              <Input label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" block size="lg" className="mt-6" loading={loading}>
              <Mail aria-hidden /> Email me a code
            </Button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
                setNotice(null);
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-label font-semibold text-text-secondary hover:text-ink"
            >
              <ArrowLeft size={16} aria-hidden /> Change email
            </button>
            <h1 className="text-title text-ink">Enter your code</h1>
            {notice && <p className="mt-1.5 text-label text-text-secondary">{notice}</p>}
            <div className="mt-6">
              <Input
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-[24px] font-semibold tracking-[0.4em] tabular"
              />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" block size="lg" className="mt-6" loading={loading} disabled={code.length !== 6}>
              Sign in
            </Button>
            <button type="button" onClick={() => sendCode()} disabled={loading} className="mt-4 w-full text-center text-label font-semibold text-olive disabled:opacity-50">
              Send a new code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 rounded-[var(--radius-input)] bg-danger-bg px-3.5 py-2.5 text-label font-medium text-danger">
      {children}
    </p>
  );
}
