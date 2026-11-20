"use client";

import React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Bookmark, Trash2, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExplorePost } from "@/lib/explore";

interface Props {
  post: ExplorePost | null;
  saved: boolean;
  onClose: () => void;
  onToggleSave: (post: ExplorePost) => void;
  onDelete: (post: ExplorePost) => Promise<void>;
}

export function PostViewer({ post, saved, onClose, onToggleSave, onDelete }: Props) {
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  return (
    <DialogPrimitive.Root
      open={!!post}
      onOpenChange={o => {
        if (!o) {
          setConfirming(false);
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/90 animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[71] flex flex-col pt-[max(12px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] focus-visible:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Style by {post?.authorName}</DialogPrimitive.Title>
          <div className="flex items-center justify-between px-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{post?.authorName}</p>
              <p className="flex items-center gap-1 text-caption text-white/70">
                <MapPin size={12} /> {post?.country} · {post?.category}
              </p>
            </div>
            <DialogPrimitive.Close aria-label="Close" className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-4">
            {post && (
              // eslint-disable-next-line @next/next/no-img-element -- remote user photo
              <img src={post.imageUrl} alt={post.caption || `Style from ${post.country}`} className="max-h-full max-w-full rounded-[var(--radius-card)] object-contain" />
            )}
          </div>

          <div className="mx-auto w-full max-w-md space-y-3 px-4">
            {post?.caption && <p className="text-[15px] text-white">{post.caption}</p>}
            {post && post.tags.length > 0 && (
              <p className="text-label text-white/70">{post.tags.map(t => `#${t}`).join("  ")}</p>
            )}
            <div className="flex gap-2.5">
              {confirming ? (
                <>
                  <Button variant="inverse-ghost" className="flex-1" onClick={() => setConfirming(false)}>
                    Keep
                  </Button>
                  <Button
                    variant="destructive-filled"
                    className="flex-1"
                    loading={deleting}
                    onClick={async () => {
                      if (!post) return;
                      setDeleting(true);
                      await onDelete(post).finally(() => setDeleting(false));
                      setConfirming(false);
                    }}
                  >
                    Delete post
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="inverse-ghost" className="flex-1" onClick={() => post && onToggleSave(post)}>
                    <Bookmark className={saved ? "fill-current" : ""} />
                    {saved ? "Saved" : "Save"}
                  </Button>
                  {post?.mine && (
                    <Button variant="inverse-ghost" className="flex-1" onClick={() => setConfirming(true)}>
                      <Trash2 />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
