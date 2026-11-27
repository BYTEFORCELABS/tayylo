import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Why someone can report an Explore post. Kept short so it fits a phone action sheet. */
export const REPORT_REASONS = ["spam", "nudity", "harassment", "hate", "violence", "stolen", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Distinct reports that hide a post from everyone until it's reviewed. */
export const HIDE_AFTER_REPORTS = 3;

/**
 * Posts this viewer may see: nothing hidden by moderation (except their own),
 * nothing from people they've blocked or who've blocked them, and nothing
 * they've reported.
 */
export async function visibleTo(userId: string): Promise<Prisma.StylePostWhereInput> {
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const hiddenAuthors = [...new Set(blocks.map(b => (b.blockerId === userId ? b.blockedId : b.blockerId)))];
  return {
    AND: [
      { OR: [{ hiddenAt: null }, { authorId: userId }] },
      ...(hiddenAuthors.length ? [{ authorId: { notIn: hiddenAuthors } }] : []),
      { reports: { none: { reporterId: userId } } },
    ],
  };
}
