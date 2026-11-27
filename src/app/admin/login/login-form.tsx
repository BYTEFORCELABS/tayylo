"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(result.code === "suspended" ? "This account is suspended." : "That email and password don't match a Tayylo account.");
      setLoading(false);
      return;
    }
    // Signed in, but is this person staff? The settings endpoint says.
    const check = await fetch("/api/admin/settings");
    if (check.status === 403) {
      await signOut({ redirect: false });
      setError("This account doesn't have admin access. Ask a Tayylo owner to add you to the team.");
      setLoading(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-[var(--radius-panel)] border border-border/70 bg-surface p-8">
        <div className="mb-8 flex items-center gap-2.5">
          <Logo height={24} priority />
          <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-text-inverse">Admin</span>
        </div>
        <h1 className="text-title text-ink">Staff sign-in</h1>
        <p className="mt-1.5 text-label text-text-secondary">Use your Tayylo account email and password.</p>
        <div className="mt-6 space-y-4">
          <Input label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-input)] bg-danger-bg px-3.5 py-2.5 text-label font-medium text-danger">
            {error}
          </p>
        )}
        <Button type="submit" block size="lg" className="mt-6" loading={loading}>
          <Lock aria-hidden /> Sign in
        </Button>
        <p className="mt-5 text-caption text-text-tertiary">
          Signed in with Apple or Google only? Set a password from &ldquo;Forgot password&rdquo; in the Tayylo app first.
        </p>
      </form>
    </div>
  );
}
