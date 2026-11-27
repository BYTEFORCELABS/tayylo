"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { PageBody, PageHeader } from "@/components/ui/page";
import { clearQueries } from "@/lib/query";
import { useMe } from "@/lib/use-business";
import { SignInMethodsSection } from "@/components/settings/sign-in-methods";
import { UpdatesPreferences } from "@/components/settings/plan-card";

/** Minimal account screen for customers (tailors manage theirs in Settings). */
export default function AccountPage() {
  const router = useRouter();
  const { me } = useMe();
  const [busy, setBusy] = React.useState(false);

  return (
    <>
      <PageHeader title="Account" />
      <PageBody width="sm">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <p className="text-overline uppercase text-text-tertiary">Signed in as</p>
          <p className="mt-1 text-[15px] font-semibold text-ink">{me?.email ?? "…"}</p>
          <p className="mt-0.5 text-label capitalize text-text-secondary">{me?.role} account</p>
        </div>
        <div className="mt-4">
          <SignInMethodsSection returnTo="/account" />
        </div>
        <div className="mt-4">
          <UpdatesPreferences />
        </div>
        <Button
          variant="secondary"
          block
          className="mt-6"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await signOut({ redirect: false });
            clearQueries();
            router.replace("/welcome");
          }}
        >
          <LogOut />
          Sign out
        </Button>
      </PageBody>
    </>
  );
}
