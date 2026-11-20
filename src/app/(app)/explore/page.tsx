"use client";

// Explore: a calm, Pinterest-style board of styles shared by tailors around
// the world. Browse by country and category, save what inspires you. No
// comments, followers or chat — just the work.

import React from "react";
import { Bookmark, Compass, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip, SearchField, SegmentedControl } from "@/components/ui/choice";
import { PageBody, PageHeader } from "@/components/ui/page";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { AddStyleSheet } from "@/components/explore/add-style-sheet";
import { PostViewer } from "@/components/explore/post-viewer";
import { exploreRepo } from "@/lib/data/store";
import { EXPLORE_CATEGORIES, type ExplorePost } from "@/lib/explore";
import { invalidateQueries, useQuery } from "@/lib/query";
import { useMe } from "@/lib/use-business";
import { cn } from "@/lib/utils";

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Masonry({ children }: { children: React.ReactNode }) {
  return <div className="columns-2 gap-3 sm:columns-3 lg:columns-4">{children}</div>;
}

function MasonrySkeleton() {
  const heights = [220, 300, 260, 340, 240, 280, 320, 230];
  return (
    <Masonry>
      {heights.map((h, i) => (
        <div key={i} className="skeleton mb-3 break-inside-avoid rounded-[var(--radius-card)]" style={{ height: h }} />
      ))}
    </Masonry>
  );
}

function PostCard({ post, saved, onOpen, onToggleSave }: { post: ExplorePost; saved: boolean; onOpen: () => void; onToggleSave: () => void }) {
  const ratio = post.width && post.height ? `${post.width} / ${post.height}` : "3 / 4";
  return (
    <div className="group relative mb-3 break-inside-avoid overflow-hidden rounded-[var(--radius-card)] bg-surface-sunken">
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Open style from ${post.country}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote user photo */}
        <img
          src={post.imageUrl}
          alt={post.caption || `${post.category} style from ${post.country}`}
          loading="lazy"
          style={{ aspectRatio: ratio }}
          className="w-full object-cover transition-transform duration-[var(--duration-slow)] group-hover:scale-[1.03]"
        />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-2.5">
          <span className="block truncate text-[12px] font-semibold text-white">{post.authorName}</span>
          <span className="block truncate text-[11px] text-white/80">
            {post.country} · {post.category}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onToggleSave}
        aria-label={saved ? "Remove from saved" : "Save"}
        aria-pressed={saved}
        className={cn(
          "absolute right-2 top-2 flex size-9 items-center justify-center rounded-full backdrop-blur-md transition-colors",
          saved ? "bg-white text-olive" : "bg-black/40 text-white hover:bg-black/55"
        )}
      >
        <Bookmark size={18} className={saved ? "fill-current" : ""} />
      </button>
    </div>
  );
}

export default function ExplorePage() {
  const { role } = useMe();
  const [tab, setTab] = React.useState<"discover" | "saved">("discover");
  const [country, setCountry] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [search, setSearch] = React.useState("");
  const q = useDebounced(search.trim());
  const [addOpen, setAddOpen] = React.useState(false);
  const [open, setOpen] = React.useState<ExplorePost | null>(null);
  const [override, setOverride] = React.useState<Record<string, boolean>>({});

  const key = `explore:feed:${country}|${category}|${q}`;
  const feed = useQuery(key, () => exploreRepo.list({ country, category, q }), { staleMs: 30_000 });
  const savedQ = useQuery("explore:saved", exploreRepo.saved, { staleMs: 30_000 });

  // Extra pages ("Load more") live beside the cached first page.
  const [more, setMore] = React.useState<{ key: string; posts: ExplorePost[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const extra = more?.key === key ? more : null;
  const posts = [...(feed.data?.posts ?? []), ...(extra?.posts ?? [])];
  const cursor = extra ? extra.cursor : (feed.data?.nextCursor ?? null);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await exploreRepo.list({ country, category, q, cursor });
      setMore({ key, posts: [...(extra?.posts ?? []), ...page.posts], cursor: page.nextCursor });
    } catch {
      toast.error("Couldn't load more styles");
    } finally {
      setLoadingMore(false);
    }
  };

  const isSaved = (p: ExplorePost) => override[p.id] ?? p.saved;
  const toggleSave = async (p: ExplorePost) => {
    const next = !isSaved(p);
    setOverride(o => ({ ...o, [p.id]: next }));
    try {
      await exploreRepo.setSaved(p.id, next);
      invalidateQueries("explore:saved");
    } catch {
      setOverride(o => ({ ...o, [p.id]: !next }));
      toast.error("Couldn't update your saved styles");
    }
  };

  const remove = async (p: ExplorePost) => {
    try {
      await exploreRepo.remove(p.id);
      setOpen(null);
      toast.success("Post deleted");
    } catch {
      toast.error("Couldn't delete this post");
    }
  };

  const list = tab === "saved" ? (savedQ.data ?? []) : posts;
  const status = tab === "saved" ? (savedQ.data ? "ready" : savedQ.status) : feed.data ? "ready" : feed.status;
  const refetch = () => (tab === "saved" ? savedQ.refetch() : feed.refetch());

  return (
    <>
      <PageHeader
        title="Explore"
        description="Style inspiration from tailors around the world"
        width="lg"
        actions={
          role === "tailor" ? (
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              <span className="max-sm:sr-only">Share a style</span>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3 pb-4">
          <SegmentedControl
            ariaLabel="Explore view"
            block
            value={tab}
            onChange={setTab}
            options={[
              { value: "discover", label: "Discover" },
              { value: "saved", label: "Saved" },
            ]}
          />
          {tab === "discover" && (
            <>
              <SearchField value={search} onValueChange={setSearch} placeholder="Search styles, tags or studios" />
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
                <Chip size="sm" selected={!country} onClick={() => setCountry("")}>
                  All countries
                </Chip>
                {(feed.data?.countries ?? []).map(c => (
                  <Chip key={c.name} size="sm" selected={country === c.name} count={c.count} onClick={() => setCountry(country === c.name ? "" : c.name)}>
                    {c.name}
                  </Chip>
                ))}
              </div>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
                <Chip size="sm" selected={!category} onClick={() => setCategory("")}>
                  All styles
                </Chip>
                {EXPLORE_CATEGORIES.map(c => (
                  <Chip key={c} size="sm" selected={category === c} onClick={() => setCategory(category === c ? "" : c)}>
                    {c}
                  </Chip>
                ))}
              </div>
            </>
          )}
        </div>
      </PageHeader>

      <PageBody width="lg">
        {status === "loading" ? (
          <MasonrySkeleton />
        ) : status === "error" ? (
          <ErrorState title="Couldn't load Explore" onRetry={() => refetch()} />
        ) : list.length === 0 ? (
          tab === "saved" ? (
            <EmptyState icon={<Bookmark />} title="Nothing saved yet" description="Tap the bookmark on any style to keep it here for later." />
          ) : (
            <EmptyState
              icon={<Compass />}
              title={country || category || q ? "No styles match" : "Be the first to share a style"}
              description={
                country || category || q
                  ? "Try a different country, category or search."
                  : role === "tailor"
                    ? "Post a design and inspire tailors around the world."
                    : "Tailors haven't posted yet — check back soon."
              }
              action={
                role === "tailor" && !(country || category || q) ? (
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus />
                    Share a style
                  </Button>
                ) : undefined
              }
            />
          )
        ) : (
          <>
            <Masonry>
              {list.map(p => (
                <PostCard key={p.id} post={p} saved={tab === "saved" ? override[p.id] !== false : isSaved(p)} onOpen={() => setOpen(p)} onToggleSave={() => toggleSave(p)} />
              ))}
            </Masonry>
            {tab === "discover" && cursor && (
              <div className="flex justify-center py-6">
                <Button variant="secondary" loading={loadingMore} onClick={loadMore}>
                  Show more
                </Button>
              </div>
            )}
          </>
        )}
      </PageBody>

      <PostViewer post={open} saved={open ? (tab === "saved" ? override[open.id] !== false : isSaved(open)) : false} onClose={() => setOpen(null)} onToggleSave={toggleSave} onDelete={remove} />
      {role === "tailor" && <AddStyleSheet open={addOpen} onOpenChange={setAddOpen} />}
    </>
  );
}
