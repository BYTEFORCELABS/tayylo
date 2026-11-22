"use client";

// Fabric & material photos for an order: the hero image that makes a job
// instantly recognisable, a strip of all photos, an add sheet (camera,
// gallery or built-in swatch library) and a full-screen viewer.

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Camera, ImagePlus, Plus, Star, Trash2, ChevronLeft, ChevronRight, X, Check, Sparkles } from "lucide-react";
import { GarmentIcon } from "@/components/brand/garment-icon";
import { toast } from "sonner";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Avatar } from "@/components/ui/avatar";
import { StitchLoader } from "@/components/auth/stitch-loader";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { orderRepo } from "@/lib/data/store";
import { compressPhoto, makeThumbnail } from "@/lib/images";
import { FABRIC_LIBRARY, MATERIAL_KINDS, type MaterialKind, makeCaption, parseCaption } from "@/lib/fabrics";
import type { Media, Order } from "@/types";

// ------------------------------------------------------------------ state

export function coverOf(order: Order): Media | undefined {
  const media = order.media ?? [];
  const pinned = order.items[0]?.photos?.[0];
  return media.find(m => m.id === pinned) ?? media[0];
}

/** All photo operations for one order, keeping the list cover in sync. */
export function useOrderMaterials(order: Order, onOrder: (o: Order) => void) {
  const [busy, setBusy] = React.useState(false);

  const applyCover = async (m: Media | null) => {
    const thumbUrl = m ? await makeThumbnail(m.url).catch(() => m.url) : "";
    const updated = await orderRepo.setCover(order.id, m ? { mediaId: m.id, thumbUrl } : null);
    if (updated) onOrder(updated);
  };

  const add = async (url: string, caption: string) => {
    setBusy(true);
    try {
      const created = await orderRepo.addMedia(order.id, { url, caption });
      if (!created) throw new Error();
      const media = [created, ...(order.media ?? [])];
      onOrder({ ...order, media });
      // The first photo — or the first fabric photo — becomes the cover.
      const current = coverOf(order);
      const isFabric = parseCaption(caption).kind === "Fabric";
      if (!current || (isFabric && parseCaption(current.caption).kind !== "Fabric")) await applyCover(created);
      toast.success(`${parseCaption(caption).kind} photo added`);
    } catch {
      toast.error("Couldn't add this photo");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (m: Media) => {
    setBusy(true);
    try {
      await orderRepo.deleteMedia(order.id, m.id);
      const media = (order.media ?? []).filter(x => x.id !== m.id);
      const wasCover = coverOf(order)?.id === m.id;
      onOrder({ ...order, media });
      if (wasCover) await applyCover(media[0] ?? null);
      toast.success("Photo removed");
    } catch {
      toast.error("Couldn't remove this photo");
    } finally {
      setBusy(false);
    }
  };

  const makeCover = async (m: Media) => {
    setBusy(true);
    try {
      await applyCover(m);
      toast.success("Set as the order's cover");
    } catch {
      toast.error("Couldn't update the cover");
    } finally {
      setBusy(false);
    }
  };

  return { busy, add, remove, makeCover };
}

// ------------------------------------------------------------------- hero

interface HeroProps {
  order: Order;
  clientPhoto?: string;
  subtitle: React.ReactNode;
  subtitleTone?: "default" | "danger";
  onAdd: () => void;
  onOpen: (index: number) => void;
}

/** Large fabric image with the garment and client written over it. */
export function MaterialHero({ order, clientPhoto, subtitle, subtitleTone = "default", onAdd, onOpen }: HeroProps) {
  const media = order.media ?? [];
  const cover = coverOf(order);
  const garment = order.items[0]?.garmentType || "Garment";

  // Photos haven't arrived yet (screen opened from the list copy): show the
  // small list thumbnail blurred, or a shimmer, instead of the empty state.
  if (order.media === undefined) {
    const thumb = order.items[0]?.imageUrl;
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-panel)] bg-surface-sunken sm:aspect-[16/9]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element -- low-res placeholder
          <img src={thumb} alt="" className="absolute inset-0 size-full scale-110 object-cover blur-xl" />
        ) : (
          <div className="skeleton absolute inset-0 rounded-none" />
        )}
      </div>
    );
  }

  if (!cover) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-panel)] border border-dashed border-border-strong bg-surface">
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-surface-sunken text-ink">
            <GarmentIcon garment={garment} size={44} label="" />
          </div>
          <h2 className="mt-4 text-title text-ink">{garment}</h2>
          <p className="mt-1 flex items-center gap-2 text-label text-text-tertiary">
            <Avatar name={order.customerName} src={clientPhoto} size="xs" />
            {order.customerName}
          </p>
          <p className={cn("mt-1 text-label font-medium", subtitleTone === "danger" ? "text-danger" : "text-text-tertiary")}>{subtitle}</p>
          <p className="mt-5 max-w-xs text-label text-text-secondary">
            Add a photo of the client&apos;s fabric so anyone in the workshop can match it to this job.
          </p>
          <Button className="mt-4" onClick={onAdd}>
            <Camera />
            Add fabric
          </Button>
        </div>
      </div>
    );
  }

  const { kind, detail } = parseCaption(cover.caption);
  return (
    <motion.button
      type="button"
      layoutId={`material-${cover.id}`}
      onClick={() => onOpen(Math.max(0, media.findIndex(m => m.id === cover.id)))}
      className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-panel)] bg-panel text-left sm:aspect-[16/9]"
      aria-label={`View ${kind.toLowerCase()} photo for ${garment}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- user photos / local swatches */}
      <img
        src={cover.url}
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.02]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-caption font-semibold text-white backdrop-blur-md">
        {kind}
        {detail && <span className="font-medium text-white/80">· {detail}</span>}
      </span>
      {media.length > 1 && (
        <span className="absolute right-4 top-4 rounded-full bg-black/45 px-2.5 py-1.5 text-caption font-semibold text-white backdrop-blur-md tabular">
          1 / {media.length}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 p-5">
        <span className="block text-[28px] font-semibold leading-tight tracking-tight text-white">{garment}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-white/85">
          <Avatar name={order.customerName} src={clientPhoto} size="xs" className="ring-2 ring-white/40" />
          <span className="font-semibold text-white">{order.customerName}</span>
          <span aria-hidden>·</span>
          <span className={subtitleTone === "danger" ? "font-semibold text-[#FFB4A3]" : ""}>{subtitle}</span>
        </span>
      </span>
    </motion.button>
  );
}

/** Thumbnails of every photo plus an add tile. */
export function MaterialStrip({
  order,
  onAdd,
  onAddStyle,
  onOpen,
}: {
  order: Order;
  onAdd: () => void;
  /** Shortcut for the client's style references, right beside the photos. */
  onAddStyle?: () => void;
  onOpen: (i: number) => void;
}) {
  const media = order.media ?? [];
  if (media.length === 0 && !onAddStyle) return null;
  const cover = coverOf(order);
  return (
    <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
      <AnimatePresence initial={false}>
        {media.map((m, i) => (
          <motion.button
            key={m.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`Open ${m.caption || "photo"}`}
            className={cn(
              "relative size-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-surface-sunken",
              m.id === cover?.id && "ring-2 ring-ink ring-offset-2 ring-offset-canvas"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- user photos / local swatches */}
            <img src={m.url} alt="" className="size-full object-cover" />
            {parseCaption(m.caption).kind !== "Fabric" && (
              <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-white">
                {parseCaption(m.caption).kind}
              </span>
            )}
          </motion.button>
        ))}
      </AnimatePresence>
      {media.length > 0 && (
        <button
          type="button"
          onClick={onAdd}
          aria-label="Add photo"
          className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border border-dashed border-border-strong text-text-tertiary transition-colors hover:border-ink hover:text-ink"
        >
          <Plus size={18} strokeWidth={2} />
          <span className="text-[10px] font-semibold">Add</span>
        </button>
      )}
      {onAddStyle && (
        <button
          type="button"
          onClick={onAddStyle}
          aria-label="Add the style the client wants"
          className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] border border-dashed border-olive/50 bg-olive-soft/40 text-olive transition-colors hover:border-olive hover:bg-olive-soft"
        >
          <Sparkles size={17} strokeWidth={2} />
          <span className="text-[10px] font-semibold">Add style</span>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------- style gallery

/** The looks the client asked for, kept with the order for review at fittings. */
export function StyleGallery({ order, onAdd, onOpen }: { order: Order; onAdd: () => void; onOpen: (i: number) => void }) {
  const media = order.media ?? [];
  const styles = media.map((m, i) => ({ m, i })).filter(x => parseCaption(x.m.caption).kind === "Style");

  if (order.media === undefined) {
    return <div className="skeleton h-28 rounded-[var(--radius-card)]" />;
  }

  if (styles.length === 0) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full items-center gap-4 rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface px-4 py-4 text-left transition-colors hover:border-ink"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink">
          <Sparkles size={20} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">Add the style the client wants</span>
          <span className="block text-label text-text-tertiary">Screenshots, magazine pages or sketches, kept with this order.</span>
        </span>
        <Plus size={20} strokeWidth={1.75} className="text-text-tertiary" />
      </button>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      <AnimatePresence initial={false}>
        {styles.map(({ m, i }) => {
          const { detail } = parseCaption(m.caption);
          return (
            <motion.button
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              type="button"
              onClick={() => onOpen(i)}
              aria-label={`Open style photo${detail ? `: ${detail}` : ""}`}
              className="group relative aspect-[3/4] overflow-hidden rounded-[var(--radius-control)] bg-surface-sunken text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- user photos */}
              <img src={m.url} alt="" className="size-full object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-[1.03]" />
              {detail && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-[11px] font-medium leading-tight text-white line-clamp-2">
                  {detail}
                </span>
              )}
            </motion.button>
          );
        })}
      </AnimatePresence>
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add style photo"
        className="flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border border-dashed border-border-strong text-text-tertiary transition-colors hover:border-ink hover:text-ink"
      >
        <Plus size={20} strokeWidth={2} />
        <span className="text-caption font-semibold">Add style</span>
      </button>
    </div>
  );
}

// ------------------------------------------------------------- add sheet

interface AddSheetProps {
  open: boolean;
  /** Which kind of photo the sheet starts on. */
  initialKind?: MaterialKind;
  onOpenChange: (open: boolean) => void;
  /** Receives a ready-to-store image URL and caption. */
  onPick: (url: string, caption: string) => void | Promise<void>;
  busy?: boolean;
}

export function AddMaterialSheet({ open, onOpenChange, onPick, busy, initialKind = "Fabric" }: AddSheetProps) {
  const style = initialKind === "Style";
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={style ? "Add a style photo" : "Add a photo"}
      description={
        style
          ? "Save the look the client wants (a screenshot, magazine page or sketch) so you can check the finished garment against it."
          : "Snap the client's fabric, or pick the closest swatch from the library."
      }
    >
      <AddMaterialBody
        key={open ? `open-${initialKind}` : "closed"}
        initialKind={initialKind}
        onPick={onPick}
        busy={busy}
        onDone={() => onOpenChange(false)}
      />
    </BottomSheet>
  );
}

function AddMaterialBody({
  onPick,
  busy,
  onDone,
  initialKind,
}: {
  onPick: AddSheetProps["onPick"];
  busy?: boolean;
  onDone: () => void;
  initialKind: MaterialKind;
}) {
  const [kind, setKind] = React.useState<MaterialKind>(initialKind);
  const [note, setNote] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  const fromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setWorking(true);
    try {
      const url = await compressPhoto(file);
      await onPick(url, makeCaption(kind, note));
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't use this photo");
    } finally {
      setWorking(false);
    }
  };

  const fromLibrary = async (src: string, name: string) => {
    setWorking(true);
    try {
      await onPick(src, makeCaption("Fabric", note.trim() ? `${name}, ${note.trim()}` : name));
      onDone();
    } finally {
      setWorking(false);
    }
  };

  const disabled = working || busy;

  return (
    <div className="relative space-y-5" aria-busy={disabled || undefined}>
      <SegmentedControl
        ariaLabel="Photo type"
        block
        value={kind}
        onChange={setKind}
        options={MATERIAL_KINDS.map(k => ({ value: k.value, label: k.label }))}
      />
      <Input
        label="Note"
        hint="Optional"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={kind === "Fabric" ? "e.g. 6 yards, brought by client" : kind === "Style" ? "e.g. Copy the neckline and sleeves" : "e.g. After 1st fitting"}
      />

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={fromFile} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={fromFile} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-ink p-4 text-left text-text-inverse transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <Camera size={22} strokeWidth={1.75} />
          <span>
            <span className="block text-[15px] font-semibold">Take photo</span>
            <span className="text-caption text-white/70">Use the camera</span>
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => galleryRef.current?.click()}
          className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface-raised p-4 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <ImagePlus size={22} strokeWidth={1.75} className="text-ink" />
          <span>
            <span className="block text-[15px] font-semibold text-ink">From gallery</span>
            <span className="text-caption text-text-tertiary">Pick an existing photo</span>
          </span>
        </button>
      </div>

      {kind === "Fabric" && (
        <div>
          <div className="mb-3 flex items-center gap-3 text-caption text-text-tertiary">
            <span className="h-px flex-1 bg-divider" />
            or choose a swatch
            <span className="h-px flex-1 bg-divider" />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {FABRIC_LIBRARY.map(f => (
              <button
                key={f.slug}
                type="button"
                disabled={disabled}
                onClick={() => fromLibrary(f.src, f.name)}
                className="group text-left disabled:opacity-50"
              >
                <span className="block aspect-square overflow-hidden rounded-[var(--radius-control)] bg-surface-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local swatch */}
                  <img src={f.src} alt="" loading="lazy" className="size-full object-cover transition-transform duration-[var(--duration-normal)] group-hover:scale-105" />
                </span>
                <span className="mt-1.5 block truncate text-caption font-medium text-text-secondary">{f.name}</span>
              </button>
            ))}
          </div>
          <details className="mt-3 text-[11px] text-text-tertiary">
            <summary className="cursor-pointer select-none font-medium">Swatch photo credits</summary>
            <ul className="mt-2 space-y-0.5">
              {FABRIC_LIBRARY.map(f => (
                <li key={f.slug}>
                  {f.name}: {f.credit}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {/* Clear "something is happening" state: covers the sheet while the photo uploads. */}
      {disabled && (
        <div className="absolute inset-0 z-10 rounded-[var(--radius-card)] bg-surface-raised/90 backdrop-blur-sm animate-fade-in">
          <div className="sticky top-24 flex flex-col items-center gap-2 px-6 pt-24 text-center text-olive">
            <div className="w-56">
              <StitchLoader label={kind === "Style" ? "Adding your style" : kind === "Fabric" ? "Adding your fabric" : "Adding your photo"} />
            </div>
            <p className="text-label text-text-secondary">This only takes a moment — please keep this open.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- viewer

interface ViewerProps {
  order: Order;
  index: number | null;
  onIndex: (i: number | null) => void;
  onRemove: (m: Media) => Promise<void>;
  onCover: (m: Media) => Promise<void>;
  busy?: boolean;
}

/** Full-screen photo viewer with cover / remove actions. */
export function MaterialViewer({ order, index, onIndex, onRemove, onCover, busy }: ViewerProps) {
  const media = order.media ?? [];
  const open = index !== null && media.length > 0;
  const i = Math.min(index ?? 0, Math.max(0, media.length - 1));
  const m = media[i];
  const [confirming, setConfirming] = React.useState(false);
  const [dir, setDir] = React.useState(0);
  const isCover = m && coverOf(order)?.id === m.id;

  const go = (d: number) => {
    if (media.length < 2) return;
    setDir(d);
    setConfirming(false);
    onIndex((i + d + media.length) % media.length);
  };

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const { kind, detail } = parseCaption(m?.caption);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={o => !o && (onIndex(null), setConfirming(false))}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/90 animate-fade-in" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[71] flex flex-col pt-[max(12px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] focus-visible:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{kind} photo</DialogPrimitive.Title>
          <div className="flex items-center justify-between px-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">
                {kind}
                {detail && <span className="font-normal text-white/70"> · {detail}</span>}
              </p>
              <p className="text-caption text-white/60 tabular">
                {i + 1} of {media.length} · {order.items[0]?.garmentType} for {order.customerName}
              </p>
            </div>
            <DialogPrimitive.Close
              aria-label="Close"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 py-4">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              {m && (
                <motion.img
                  key={m.id}
                  src={m.url}
                  alt={m.caption || "Order photo"}
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -60 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  drag={media.length > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.25}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) go(1);
                    else if (info.offset.x > 60) go(-1);
                  }}
                  className="max-h-full max-w-full select-none rounded-[var(--radius-card)] object-contain"
                  draggable={false}
                />
              )}
            </AnimatePresence>
            {media.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          <div className="mx-auto flex w-full max-w-md gap-2.5 px-4">
            {confirming ? (
              <>
                <Button variant="inverse-ghost" className="flex-1" onClick={() => setConfirming(false)}>
                  Keep
                </Button>
                <Button
                  variant="destructive-filled"
                  className="flex-1"
                  loading={busy}
                  onClick={async () => {
                    if (!m) return;
                    await onRemove(m);
                    setConfirming(false);
                    if (media.length <= 1) onIndex(null);
                    else onIndex(Math.max(0, i - 1));
                  }}
                >
                  Remove photo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="inverse-ghost"
                  className="flex-1"
                  disabled={isCover || busy}
                  onClick={() => m && onCover(m)}
                >
                  {isCover ? <Check /> : <Star />}
                  {isCover ? "Cover photo" : "Set as cover"}
                </Button>
                <Button variant="inverse-ghost" className="flex-1" onClick={() => setConfirming(true)}>
                  <Trash2 />
                  Remove
                </Button>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
