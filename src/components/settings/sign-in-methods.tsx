"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { ApiRequestError, signInMethodsRepo, type SignInMethods } from "@/lib/data/store";
import { useQuery, setQueryData } from "@/lib/query";

function AppleGlyph() {
  return (
    <svg viewBox="0 0 384 512" fill="currentColor" aria-hidden>
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 37 59 127.6 107.2 126.1 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-83.5 102.6-120.6-65.2-30.7-61.7-90-61.7-91.4zM255.3 100.6c26.7-31.8 24.3-60.8 23.5-71.2-23.6 1.4-51 16.5-66.5 35-17.1 19.8-27.3 44.4-25.1 70.5 24.1 1.9 46-11.2 68.1-34.3z" />
    </svg>
  );
}

const LINK_ERRORS: Record<string, string> = {
  identity_taken: "That Apple ID is already connected to another Tayylo account.",
  provider_already_linked: "A different Apple ID is already connected to this account.",
};

/**
 * "Sign in with Apple" row for Settings / Account: connect (through the normal
 * Apple redirect, flagged as a link so it attaches to THIS account) or
 * disconnect (only while another way to sign in remains).
 */
export function SignInMethodsSection(props: { returnTo: "/settings" | "/account"; className?: string }) {
  // useSearchParams needs a Suspense boundary on prerendered pages.
  return (
    <React.Suspense fallback={null}>
      <SignInMethodsInner {...props} />
    </React.Suspense>
  );
}

function SignInMethodsInner({ returnTo, className }: { returnTo: "/settings" | "/account"; className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data } = useQuery<SignInMethods | null>("sign-in-methods", signInMethodsRepo.get, { staleMs: 60_000 });
  const [busy, setBusy] = React.useState(false);

  // Outcome of a connect round-trip, reported once, then cleaned from the URL.
  React.useEffect(() => {
    const linked = searchParams.get("linked");
    const linkError = searchParams.get("linkError");
    if (!linked && !linkError) return;
    if (linked) toast.success("Apple is connected. You can now sign in with Apple.");
    else toast.error(LINK_ERRORS[searchParams.get("code") ?? ""] ?? "Couldn't connect Apple. Please try again.");
    router.replace(returnTo);
  }, [searchParams, router, returnTo]);

  if (!data?.available.appleWeb && !data?.identities.some(i => i.provider === "apple")) return null;
  const apple = data.identities.find(i => i.provider === "apple");

  const connect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: true, returnTo }),
      });
      if (!res.ok) throw new Error();
      await signIn("apple", { callbackUrl: `${returnTo}?linked=apple` });
    } catch {
      toast.error("Couldn't reach Tayylo. Check your connection and try again.");
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await signInMethodsRepo.disconnect("apple");
      setQueryData<SignInMethods | null>("sign-in-methods", old =>
        old ? { ...old, identities: old.identities.filter(i => i.provider !== "apple") } : null
      );
      toast.success("Apple disconnected");
    } catch (e) {
      toast.error(e instanceof ApiRequestError ? e.message : "Couldn't disconnect Apple");
    } finally {
      setBusy(false);
    }
  };

  return (
    <List className={className}>
      <ListItem
        leading={
          <IconTile>
            <AppleGlyph />
          </IconTile>
        }
        title="Sign in with Apple"
        subtitle={apple ? (apple.isPrivateEmail ? "Connected · email hidden by Apple" : `Connected${apple.email ? ` · ${apple.email}` : ""}`) : "Not connected"}
        trailing={
          apple ? (
            <Button variant="ghost" size="sm" loading={busy} onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button variant="secondary" size="sm" loading={busy} onClick={connect}>
              Connect
            </Button>
          )
        }
      />
    </List>
  );
}
