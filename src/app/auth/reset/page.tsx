"use client";

import React, { Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = !!token && password.length >= 6 && password === confirmPassword && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not reset your password");
      return;
    }
    router.push("/auth?mode=signin");
  };

  return (
    <div className="min-h-[100dvh] bg-cream flex flex-col items-center justify-center px-6">
      <div className="flex justify-center mb-6">
        <Image src="/symbol_olive.png" alt="Tayylo" width={48} height={48} />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl font-bold text-text-primary mb-1.5 text-center">
          Set a new password
        </h1>
        <p className="text-base text-text-secondary mb-7 text-center">
          {token ? "Choose a new password for your account." : "Open this page from the reset link in your email."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="New password"
              disabled={!token}
              autoComplete="new-password"
              className="w-full h-14 pl-11 pr-11 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-50"
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

          <input
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={!token}
            autoComplete="new-password"
            className="w-full h-14 px-4 rounded-[var(--radius-input)] border border-border bg-white-warm text-base text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive disabled:opacity-50"
          />

          {error && (
            <p className="text-sm text-danger bg-danger-bg rounded-[var(--radius-input)] px-3.5 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-14 rounded-[var(--radius-button)] bg-olive text-white-warm font-semibold text-base hover:bg-olive-deep transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-cream" />}>
      <ResetPasswordPageInner />
    </Suspense>
  );
}
