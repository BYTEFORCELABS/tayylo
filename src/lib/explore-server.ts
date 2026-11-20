import type { StylePost } from "@prisma/client";

/** Public JSON shape of a post for the signed-in viewer. */
export function shape(p: StylePost, userId: string, savedIds: Set<string>) {
  return {
    id: p.id,
    authorName: p.authorName,
    country: p.country,
    category: p.category,
    caption: p.caption,
    tags: p.tags,
    imageUrl: p.imageUrl,
    width: p.width,
    height: p.height,
    createdAt: p.createdAt.toISOString(),
    saved: savedIds.has(p.id),
    mine: p.authorId === userId,
  };
}

