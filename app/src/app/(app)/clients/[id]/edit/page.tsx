"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { customerRepo } from "@/lib/mock/store";
import type { Customer } from "@/types";
import { toast } from "sonner";

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [client, setClient] = React.useState<Customer | null>(null);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    customerRepo.getById(clientId).then(c => {
      if (c) {
        setClient(c);
        setName(c.fullName);
        setPhone(c.phones[0] || "");
        setEmail(c.email || "");
        setNotes(c.notes || "");
        setTags(c.tags.join(", "));
      }
      setLoading(false);
    });
  }, [clientId]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await customerRepo.update(clientId, {
      fullName: name.trim(),
      phones: phone.trim() ? [phone.trim()] : [],
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    toast("Client updated");
    setSaving(false);
    router.push(`/clients/${clientId}`);
  };

  const handleDelete = async () => {
    // In real app, would soft-delete. For demo, just go back
    toast("Client deleted");
    setDeleteOpen(false);
    router.push("/clients");
  };

  if (loading || !client) {
    return (
      <div className="px-4 pt-safe pt-8 text-center">
        <p className="text-sm text-text-secondary">{loading ? "Loading..." : "Client not found"}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-cream">
      <div className="px-4 pt-safe max-w-lg mx-auto pb-8">
        <div className="flex items-center gap-3 pt-4 mb-6">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-beige-light transition-colors"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="font-serif text-xl text-text-primary">Edit client</h1>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-6">
          <Avatar name={name || client.fullName} size="xl" />
        </div>

        {/* Form */}
        <div className="space-y-4 mb-8">
          <Input
            label="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Enter client name"
          />
          <Input
            label="Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+234 800 000 0000"
            type="tel"
          />
          <Input
            label="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
            type="email"
          />
          <Input
            label="Tags"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="VIP, Regular, Wedding"
            helperText="Separate with commas"
          />
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Preferences, allergies, referrals..."
              className="w-full h-24 px-4 py-3 rounded-[var(--radius-input)] border border-border bg-white-warm text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-olive resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="primary"
            className="w-full h-12"
            disabled={!name.trim() || saving}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>

          <button
            onClick={() => setDeleteOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-3 text-sm text-danger hover:underline"
          >
            <Trash2 size={14} strokeWidth={1.5} />
            Delete client
          </button>
        </div>

        {/* Delete confirmation */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {client.fullName}?</DialogTitle>
              <DialogDescription>
                This will permanently delete this client and all their measurements. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button variant="destructive-filled" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
