"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/components/admin/request";

export function AddStaffForm({ allowOwner = false }: { allowOwner?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("moderator");
  const [busy, setBusy] = React.useState(false);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={async e => {
        e.preventDefault();
        setBusy(true);
        try {
          await adminRequest("/api/admin/team", "POST", { email, staffRole: role });
          toast.success(`${email} can now sign in to the admin portal with an emailed code`);
          setEmail("");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Their Tayylo account email"
        aria-label="Email"
        className="h-11 flex-1 rounded-full border border-border bg-surface-raised px-4 text-[15px] focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12"
      />
      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        aria-label="Access level"
        className="h-11 rounded-full border border-border bg-surface-raised px-4 text-[14px] font-semibold"
      >
        <option value="moderator">Moderator</option>
        <option value="admin">Admin</option>
        {allowOwner && <option value="owner">Owner</option>}
      </select>
      <Button type="submit" loading={busy}>Add to team</Button>
    </form>
  );
}
