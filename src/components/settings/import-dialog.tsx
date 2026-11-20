"use client";

import React from "react";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { customerRepo } from "@/lib/data/store";

type Row = { fullName: string; phone?: string; email?: string; notes?: string };

/** Splits one CSV line, honouring quoted fields that contain commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCsv(text: string): Row[] {
  return text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(splitCsvLine)
    .map(p => ({ fullName: p[0] || "", phone: p[1] || undefined, email: p[2] || undefined, notes: p[3] || undefined }))
    .filter(r => r.fullName && r.fullName.toLowerCase() !== "full name" && r.fullName.toLowerCase() !== "name");
}

export function ImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{open && <ImportForm onOpenChange={onOpenChange} />}</DialogContent>
    </Dialog>
  );
}

function ImportForm({ onOpenChange }: { onOpenChange: (o: boolean) => void }) {
  const [csv, setCsv] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const rows = React.useMemo(() => parseCsv(csv), [csv]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    file
      .text()
      .then(setCsv)
      .catch(() => toast.error("Couldn't read that file"));
  };

  const run = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      const count = await customerRepo.importCustomers(rows);
      toast.success(`Imported ${count} ${count === 1 ? "client" : "clients"}`);
      onOpenChange(false);
    } catch {
      toast.error("Import failed. Nothing was added.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Import clients</DialogTitle>
          <DialogDescription>One client per row: name, phone, email, notes. Only the name is required.</DialogDescription>
        </DialogHeader>

        <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={onFile} />
        <Button variant="secondary" block onClick={() => fileRef.current?.click()}>
          <FileUp />
          Choose a CSV file
        </Button>

        <div className="my-4 flex items-center gap-3 text-caption text-text-tertiary">
          <span className="h-px flex-1 bg-divider" />
          or paste rows
          <span className="h-px flex-1 bg-divider" />
        </div>

        <Textarea
          aria-label="CSV rows"
          rows={5}
          value={csv}
          onChange={e => setCsv(e.target.value)}
          className="font-mono text-[13px]"
          placeholder={"Chioma Adebayo, +234 803 999 1122, chioma@mail.com, Wedding guest\nEmeka Okafor, +234 812 555 7788, , Prefers kaftans"}
          helperText={csv.trim() ? `${rows.length} ${rows.length === 1 ? "client" : "clients"} ready to import` : undefined}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={run} loading={busy} disabled={rows.length === 0}>
            Import {rows.length > 0 ? rows.length : ""}
          </Button>
        </DialogFooter>
    </>
  );
}
