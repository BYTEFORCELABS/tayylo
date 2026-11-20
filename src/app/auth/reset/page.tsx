"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, LinkIcon } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !!token && password.length >= 6 && password === confirm && !loading;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Could not reset your password");
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't reach Tayylo. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout onBack={() => router.push("/auth?mode=signin")} backLabel="Back to sign in">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-surface-sunken text-text-secondary">
          <LinkIcon size={24} strokeWidth={1.75} />
        </div>
        <h1 className="text-title text-ink">Open the link from your email</h1>
        <p className="mt-2 text-body text-text-secondary">
          This page needs the reset link we emailed you. If it expired, request a new one.
        </p>
        <Button size="lg" block className="mt-8" onClick={() => router.push("/auth?mode=signin")}>
          Back to sign in
        </Button>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout onBack={() => router.push("/auth?mode=signin")} backLabel="Back to sign in">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-success-bg text-success animate-scale-in">
          <CheckCircle2 size={26} strokeWidth={1.75} />
        </div>
        <h1 className="text-title text-ink">Password updated</h1>
        <p className="mt-2 text-body text-text-secondary">Sign in with your new password to continue.</p>
        <Button size="lg" block className="mt-8" onClick={() => router.push("/auth?mode=signin")}>
          Sign in
        </Button>
      </AuthLayout>
    );
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShow(v => !v)}
      aria-label={show ? "Hide passwords" : "Show passwords"}
      className="flex size-9 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-sunken hover:text-ink"
    >
      {show ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
    </button>
  );

  return (
    <AuthLayout onBack={() => router.push("/auth?mode=signin")} backLabel="Back to sign in">
      <h1 className="text-title text-ink">Set a new password</h1>
      <p className="mt-2 text-body text-text-secondary">Choose a password you haven&apos;t used here before.</p>

      <form onSubmit={submit} noValidate className="mt-8 space-y-5">
        <Input
          label="New password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          leadingIcon={<Lock />}
          value={password}
          onChange={e => setPassword(e.target.value)}
          error={(touched || tooShort) && password.length < 6 ? "Use at least 6 characters" : undefined}
          helperText="At least 6 characters"
          trailing={toggle}
          autoFocus
        />
        <Input
          label="Confirm new password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          leadingIcon={<Lock />}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          error={mismatch || (touched && confirm !== password) ? "Passwords don't match" : undefined}
        />
        {error && (
          <div role="alert" className="flex items-start gap-2.5 rounded-[var(--radius-input)] bg-danger-bg px-4 py-3 text-label text-danger">
            <AlertCircle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <Button type="submit" size="lg" block loading={loading}>
          Save new password
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-canvas" />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
