"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { UserX } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Tag } from "@/components/ui/tag";
import { PageBody, PageHeader, Overline } from "@/components/ui/page";
import { EmptyState, ErrorState, LoadingRegion, Skeleton } from "@/components/ui/states";
import { customerRepo } from "@/lib/data/store";
import type { Customer } from "@/types";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [client, setClient] = React.useState<Customer | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagDraft, setTagDraft] = React.useState("");
  const [nameError, setNameError] = React.useState<string>();
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    customerRepo
      .getById(clientId)
      .then(c => {
        if (c) {
          setClient(c);
          setName(c.fullName);
          setPhone(c.phones[0] || "");
          setEmail(c.email || "");
          setNotes(c.notes || "");
          setTags(c.tags);
        }
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [clientId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const addTag = () => {
    const t = tagDraft.trim().replace(/,$/, "");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  };

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) {
      setNameError("Enter the client's name");
      return;
    }
    setSaving(true);
    try {
      const pending = tagDraft.trim();
      // Keep any additional phone numbers that were stored beyond the first.
      const otherPhones = client?.phones.slice(1) ?? [];
      await customerRepo.update(clientId, {
        fullName: name.trim(),
        phones: phone.trim() ? [phone.trim(), ...otherPhones] : otherPhones,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: pending && !tags.includes(pending) ? [...tags, pending] : tags,
      });
      toast.success("Client updated");
      router.push(`/clients/${clientId}`);
    } catch {
      toast.error("Couldn't save changes");
      setSaving(false);
    }
  };

  const back = `/clients/${clientId}`;

  if (status === "loading") {
    return (
      <>
        <PageHeader variant="compact" title="Edit client" back={back} width="sm" />
        <PageBody width="sm">
          <LoadingRegion>
            <div className="space-y-5 pt-4">
              <Skeleton variant="circular" width={80} height={80} className="mx-auto" />
              {[0, 1, 2].map(i => (
                <Skeleton key={i} height={48} className="rounded-[var(--radius-input)]" />
              ))}
            </div>
          </LoadingRegion>
        </PageBody>
      </>
    );
  }

  if (status === "error") {
    return (
      <>
        <PageHeader variant="compact" title="Edit client" back={back} width="sm" />
        <ErrorState title="Couldn't load this client" onRetry={() => { setStatus("loading"); load(); }} />
      </>
    );
  }

  if (!client) {
    return (
      <>
        <PageHeader variant="compact" title="Edit client" back="/clients" width="sm" />
        <EmptyState icon={<UserX />} title="Client not found" action={<Button onClick={() => router.push("/clients")}>Back to clients</Button>} />
      </>
    );
  }

  return (
    <>
      <PageHeader variant="compact" title="Edit client" eyebrow={client.fullName} back={back} width="sm" />
      <PageBody width="sm" className="pb-[max(32px,env(safe-area-inset-bottom))]">
        <form onSubmit={handleSave} noValidate>
          <div className="flex justify-center py-4">
            <Avatar name={name || client.fullName} src={client.photoUrl} size="xl" />
          </div>

          <Overline className="mb-3 mt-2">Contact</Overline>
          <div className="space-y-5">
            <Input
              label="Full name"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setNameError(undefined);
              }}
              error={nameError}
            />
            <Input label="Phone" hint="Optional" type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
            <Input label="Email" hint="Optional" type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
          </div>

          <Overline className="mb-3 mt-8">Organise</Overline>
          <div className="space-y-5">
            <div>
              <Input
                label="Tags"
                hint="Press Enter to add"
                value={tagDraft}
                onChange={e => setTagDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="VIP, Wedding, Regular"
              />
              {tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map(t => (
                    <Tag key={t} variant="olive" removable onRemove={() => setTags(tags.filter(x => x !== t))}>
                      {t}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              label="Notes"
              hint="Optional"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Fit preferences, posture, referrals"
            />
          </div>

          <div className="mt-10 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" size="lg" onClick={() => router.push(back)}>
              Cancel
            </Button>
            <Button type="submit" size="lg" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </PageBody>
    </>
  );
}
