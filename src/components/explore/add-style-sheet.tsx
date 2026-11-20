"use client";

// Share a style to Explore. While the photo uploads and the post is created,
// a stitching animation covers the sheet so it's clear the app is working.

import React from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StitchLoader } from "@/components/auth/stitch-loader";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { exploreRepo } from "@/lib/data/store";
import { EXPLORE_CATEGORIES, EXPLORE_COUNTRIES } from "@/lib/explore";
import { preparePhoto } from "@/lib/images";
import { useBusiness } from "@/lib/use-business";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStyleSheet({ open, onOpenChange }: Props) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share a style"
      description="Post a design to Explore so tailors around the world can get inspired. Only share work you made or have permission to share."
    >
      {open && <Body onDone={() => onOpenChange(false)} />}
    </BottomSheet>
  );
}

function Body({ onDone }: { onDone: () => void }) {
  const { business } = useBusiness();
  const [photo, setPhoto] = React.useState<{ blob: Blob; width: number; height: number; previewUrl: string } | null>(null);
  const [category, setCategory] = React.useState<string>("");
  const [country, setCountry] = React.useState<string>(
    (EXPLORE_COUNTRIES as readonly string[]).includes(business?.country ?? "") ? business!.country : ""
  );
  const [caption, setCaption] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [preparing, setPreparing] = React.useState(false);
  const [posting, setPosting] = React.useState(false);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.previewUrl);
  }, [photo]);

  const choose = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPreparing(true);
    try {
      setPhoto(await preparePhoto(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use this photo");
    } finally {
      setPreparing(false);
    }
  };

  const ready = !!photo && !!category && !!country;

  const post = async () => {
    if (!photo || !ready || posting) return;
    setPosting(true);
    try {
      const imageUrl = await exploreRepo.upload(photo.blob);
      await exploreRepo.create({
        imageUrl,
        caption: caption.trim() || undefined,
        country,
        category,
        tags: tags.split(/[,\s#]+/).filter(Boolean).slice(0, 8),
        width: photo.width,
        height: photo.height,
      });
      toast.success("Your style is live on Explore");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't share this style");
      setPosting(false);
    }
  };

  return (
    <div className="relative space-y-5" aria-busy={posting || undefined}>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={choose} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={choose} />

      {photo ? (
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
          <img src={photo.previewUrl} alt="Selected style" className="max-h-72 w-full object-contain" />
          <Button variant="secondary" size="sm" className="absolute right-3 top-3" onClick={() => galleryRef.current?.click()}>
            <RefreshCw />
            Change
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={preparing}
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-ink p-4 text-left text-text-inverse transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <Camera size={22} strokeWidth={1.75} />
            <span className="block text-[15px] font-semibold">Take photo</span>
          </button>
          <button
            type="button"
            disabled={preparing}
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface-raised p-4 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            <ImagePlus size={22} strokeWidth={1.75} className="text-ink" />
            <span className="block text-[15px] font-semibold text-ink">From gallery</span>
          </button>
        </div>
      )}
      {preparing && <p className="text-center text-label text-text-secondary">Preparing photo…</p>}

      <div>
        <p className="mb-2 text-label font-semibold text-ink">Category</p>
        <div className="flex flex-wrap gap-2">
          {EXPLORE_CATEGORIES.map(c => (
            <Chip key={c} size="sm" selected={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="explore-country" className="mb-2 block text-label font-semibold text-ink">
          Country
        </label>
        <select
          id="explore-country"
          value={country}
          onChange={e => setCountry(e.target.value)}
          className="h-12 w-full rounded-[var(--radius-input)] border border-border bg-surface-raised px-4 text-[15px] text-ink focus:border-olive focus:outline-none focus:ring-4 focus:ring-olive/12"
        >
          <option value="">Choose a country</option>
          {EXPLORE_COUNTRIES.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <Input label="Caption" hint="Optional" value={caption} onChange={e => setCaption(e.target.value)} maxLength={280} placeholder="e.g. Hand-beaded aso-oke gown" />
      <Input label="Tags" hint="Optional" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. agbada, lace, wedding" />

      <Button block size="lg" disabled={!ready || posting} onClick={post}>
        Share to Explore
      </Button>

      {(posting) && (
        <div className="absolute inset-0 z-10 rounded-[var(--radius-card)] bg-surface-raised/90 backdrop-blur-sm animate-fade-in">
          <div className="sticky top-24 flex flex-col items-center gap-2 px-6 pt-24 text-center text-olive">
            <div className="w-56">
              <StitchLoader label="Publishing your style" />
            </div>
            <p className="text-label text-text-secondary">Uploading your photo — please keep this open.</p>
          </div>
        </div>
      )}
    </div>
  );
}
