"use client";

import React from "react";
import { Download, Sheet, Archive } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { List, ListItem, IconTile } from "@/components/ui/list";
import { exportData } from "@/lib/data/store";

function download(content: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [busy, setBusy] = React.useState<"csv" | "json" | null>(null);
  const date = new Date().toISOString().slice(0, 10);

  const run = async (kind: "csv" | "json") => {
    setBusy(kind);
    try {
      const { csvStr, jsonStr } = await exportData();
      if (kind === "csv") {
        download(csvStr, "text/csv", `tayylo-clients-${date}.csv`);
        toast.success("Clients spreadsheet downloaded");
      } else {
        download(jsonStr, "application/json", `tayylo-backup-${date}.json`);
        toast.success("Full backup downloaded");
      }
    } catch {
      toast.error("Export failed. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const trailing = (kind: "csv" | "json") =>
    busy === kind ? (
      <span className="size-4 animate-spin rounded-full border-2 border-ink border-r-transparent" />
    ) : (
      <Download size={18} strokeWidth={1.75} className="text-text-tertiary" />
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export data</DialogTitle>
          <DialogDescription>Your records belong to you. Download a copy any time.</DialogDescription>
        </DialogHeader>
        <List>
          <ListItem
            onClick={() => !busy && run("csv")}
            leading={
              <IconTile>
                <Sheet />
              </IconTile>
            }
            title="Clients spreadsheet"
            subtitle="CSV · opens in Excel, Sheets or Numbers"
            trailing={trailing("csv")}
          />
          <ListItem
            onClick={() => !busy && run("json")}
            leading={
              <IconTile>
                <Archive />
              </IconTile>
            }
            title="Full backup"
            subtitle="JSON · clients, measurement history and orders"
            trailing={trailing("json")}
          />
        </List>
      </DialogContent>
    </Dialog>
  );
}
