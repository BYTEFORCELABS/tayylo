"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SegmentedControl } from "@/components/ui/choice";
import { ListSkeleton, ErrorState } from "@/components/ui/states";
import { useTemplates } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function TemplatesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <TemplatesBody />}</DialogContent>
    </Dialog>
  );
}

function TemplatesBody() {
  const templatesQ = useTemplates();
  const templates = templatesQ.data ?? null;
  const failed = !templates && templatesQ.status === "error";
  const load = () => templatesQ.refetch();
  const [category, setCategory] = React.useState("All");
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const categories = ["All", ...Array.from(new Set((templates ?? []).map(t => t.category)))];
  const shown = (templates ?? []).filter(t => category === "All" || t.category === category);

  return (
    <>
        <DialogHeader>
          <DialogTitle>Measurement templates</DialogTitle>
          <DialogDescription>The fields Tayylo asks for when you measure each garment.</DialogDescription>
        </DialogHeader>

        {categories.length > 2 && (
          <SegmentedControl
            ariaLabel="Category"
            block
            size="sm"
            className="mb-4"
            value={category}
            onChange={setCategory}
            options={categories.map(c => ({ value: c, label: c }))}
          />
        )}

        {failed ? (
          <ErrorState title="Couldn't load templates" onRetry={load} className="py-8" />
        ) : !templates ? (
          <ListSkeleton count={5} avatar={false} />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border/70 bg-surface divide-y divide-divider">
            {shown.map(t => {
              const isOpen = expanded === t.id;
              const groups = Array.from(new Set(t.fields.map(f => f.group)));
              return (
                <div key={t.id}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-beige-light/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-ink">{t.name}</p>
                      <p className="text-label text-text-tertiary">
                        {t.category} · {t.fields.length} measurements
                      </p>
                    </div>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.75}
                      className={cn("text-text-tertiary transition-transform duration-[var(--duration-normal)]", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <div className="space-y-3 px-4 pb-4 animate-fade-in">
                      {groups.map(g => (
                        <div key={g}>
                          <p className="mb-1.5 text-overline uppercase text-text-tertiary">{g}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {t.fields
                              .filter(f => f.group === g)
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map(f => (
                                <span key={f.id} className="rounded-full bg-surface-raised px-2.5 py-1 text-caption font-medium text-text-secondary border border-border">
                                  {f.label}
                                </span>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}
