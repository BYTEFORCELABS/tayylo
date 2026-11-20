"use client";

import React from "react";
import { Camera, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { customerRepo } from "@/lib/data/store";
import type { Media } from "@/types";

interface Props {
  clientId: string;
  media: Media[];
  onChange: (media: Media[]) => void;
}

export function PhotosTab({ clientId, media, onChange }: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Media | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const item = await customerRepo.addMedia(clientId, {
          url: reader.result as string,
          caption: `Style reference · ${new Date().toLocaleDateString("en-GB")}`,
        });
        if (item) {
          onChange([item, ...media]);
          toast.success("Photo added");
        }
      } catch {
        toast.error("Couldn't upload this photo");
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("Couldn't read this file");
    };
    reader.readAsDataURL(file);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await customerRepo.deleteMedia(clientId, toDelete.id);
      onChange(media.filter(m => m.id !== toDelete.id));
      toast.success("Photo removed");
      setToDelete(null);
    } catch {
      toast.error("Couldn't remove this photo");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={upload} />

      {media.length === 0 ? (
        <EmptyState
          variant="inset"
          icon={<Camera />}
          title="No photos yet"
          description="Keep fabric swatches, style references and fitting photos with the client."
          action={
            <Button onClick={() => inputRef.current?.click()} loading={uploading}>
              <ImagePlus />
              Add photo
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-label text-text-tertiary">
              {media.length} {media.length === 1 ? "photo" : "photos"}
            </p>
            <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
              <ImagePlus />
              Add photo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {media.map(m => (
              <figure key={m.id} className="group relative overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads (data URLs) */}
                <img src={m.url} alt={m.caption || "Client photo"} className="aspect-[4/5] w-full object-cover" />
                {m.caption && (
                  <figcaption className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-ink/70 to-transparent px-3 pb-2.5 pt-6 text-caption text-text-inverse">
                    {m.caption}
                  </figcaption>
                )}
                <button
                  type="button"
                  onClick={() => setToDelete(m)}
                  aria-label="Remove photo"
                  className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-surface-raised/90 text-ink shadow-[var(--shadow-xs)] backdrop-blur transition-colors hover:bg-danger hover:text-text-inverse"
                >
                  <Trash2 size={16} strokeWidth={1.75} />
                </button>
              </figure>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this photo?</DialogTitle>
            <DialogDescription>It will be deleted from the client&apos;s profile.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Keep
            </Button>
            <Button variant="destructive-filled" onClick={confirmDelete} loading={deleting}>
              Remove photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
