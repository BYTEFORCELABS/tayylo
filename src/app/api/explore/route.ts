import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireTailorId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { EXPLORE_CATEGORIES } from "@/lib/explore";
import { shape } from "@/lib/explore-server";
import { visibleTo } from "@/lib/explore-moderation";
import { getAppSettings } from "@/lib/app-settings";
import { assertPlanAllows } from "@/lib/billing/plans";

const PAGE = 24;

// Any signed-in user (tailor or customer) can browse.
export async function GET(request: Request) {
  try {
    const { userId } = await requireUser();
    const url = new URL(request.url);
    const country = url.searchParams.get("country") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const q = url.searchParams.get("q")?.trim() || undefined;
    const cursor = url.searchParams.get("cursor") || undefined;

    const visible = await visibleTo(userId);
    const where = {
      ...visible,
      ...(country ? { country } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { caption: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q.toLowerCase() } },
              { authorName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const rows = await prisma.stylePost.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, PAGE);
    const saved = await prisma.savedPost.findMany({
      where: { userId, postId: { in: page.map(p => p.id) } },
      select: { postId: true },
    });
    const savedIds = new Set(saved.map(s => s.postId));

    // Country filter options (only on the first page, ignoring the country filter itself).
    let countries: { name: string; count: number }[] = [];
    if (!cursor) {
      const grouped = await prisma.stylePost.groupBy({
        by: ["country"],
        where: { ...visible, ...(category ? { category } : {}), ...(where.OR ? { OR: where.OR } : {}) },
        _count: { _all: true },
        orderBy: { _count: { country: "desc" } },
      });
      countries = grouped.map(g => ({ name: g.country, count: g._count._all }));
    }

    return Response.json({
      posts: page.map(p => shape(p, userId, savedIds)),
      nextCursor: rows.length > PAGE ? page[page.length - 1].id : null,
      countries,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

const createSchema = z.object({
  // Only https images (the upload route returns an https Vercel Blob URL).
  // z.url() alone accepts any scheme, including javascript: and ftp:.
  imageUrl: z
    .string()
    .url()
    .max(2000)
    .refine(u => /^https:\/\//i.test(u), "Photo must be an https URL"),
  caption: z.string().trim().max(280).optional(),
  country: z.string().trim().min(2).max(60),
  category: z.enum(EXPLORE_CATEGORIES),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30)).max(8).default([]),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
});

// Only tailors can post.
export async function POST(request: Request) {
  try {
    const userId = await requireTailorId();
    if (!(await getAppSettings()).explorePostingEnabled) throw new ApiError(503, "Posting to Explore is paused right now");
    await assertPlanAllows(userId, "explorePosting");
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Add a photo, a country and a category");
    const d = parsed.data;

    const business = await prisma.business.findUnique({ where: { ownerId: userId }, select: { name: true } });
    const post = await prisma.stylePost.create({
      data: {
        authorId: userId,
        authorName: business?.name || "A Tayylo tailor",
        country: d.country,
        category: d.category,
        caption: d.caption || null,
        tags: [...new Set(d.tags)],
        imageUrl: d.imageUrl,
        width: d.width ?? null,
        height: d.height ?? null,
      },
    });
    return Response.json(shape(post, userId, new Set()), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
