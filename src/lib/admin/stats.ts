import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const DAY = 864e5;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const num = (v: bigint | number | null | undefined) => Number(v ?? 0);

export type Range = "7d" | "30d" | "90d" | "all";
export const RANGES: { key: Range; label: string }[] = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "all", label: "All time" },
];
export const asRange = (v: string | undefined): Range => (RANGES.some(r => r.key === v) ? (v as Range) : "30d");
const since = (r: Range) => (r === "all" ? new Date(0) : daysAgo(parseInt(r)));

export interface DayPoint {
  day: string; // YYYY-MM-DD (UTC)
  count: number;
}

/** One row per UTC day for the last `days` days, zero-filled. */
async function dailyCounts(table: "User" | "Order" | "StylePost", days: number): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT d::date AS day, COUNT(t."id") AS count
    FROM generate_series((now() AT TIME ZONE 'UTC')::date - ${days - 1}::int, (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS d
    LEFT JOIN ${Prisma.raw(`"${table}"`)} t ON (t."createdAt" AT TIME ZONE 'UTC')::date = d::date
    GROUP BY d ORDER BY d`;
  return rows.map(r => ({ day: new Date(r.day).toISOString().slice(0, 10), count: num(r.count) }));
}

/** Round-trip time of a trivial query, in ms. */
async function dbLatency() {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, ms: Math.round(performance.now() - start) };
  } catch {
    return { ok: false, ms: null };
  }
}

export async function overview() {
  const [
    users,
    tailors,
    customers,
    suspended,
    new7,
    newPrev7,
    active1,
    active7,
    active30,
    clients,
    businesses,
    orders,
    orders30,
    ordersPrev30,
    payments30,
    measurements30,
    posts,
    posts30,
    reportedPosts,
    hiddenPosts,
    signupSeries,
    orderSeries,
    db,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "tailor" } }),
    prisma.user.count({ where: { role: "customer" } }),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(7) } } }),
    prisma.user.count({ where: { createdAt: { gte: daysAgo(14), lt: daysAgo(7) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: daysAgo(1) } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: daysAgo(7) } } }),
    prisma.user.groupBy({ by: ["lastSeenClient"], where: { lastSeenAt: { gte: daysAgo(30) } }, _count: { _all: true } }),
    prisma.customer.count(),
    prisma.business.count(),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.order.count({ where: { createdAt: { gte: daysAgo(60), lt: daysAgo(30) } } }),
    prisma.payment.count({ where: { paidAt: { gte: daysAgo(30) } } }),
    prisma.measurementSet.count({ where: { takenAt: { gte: daysAgo(30) } } }),
    prisma.stylePost.count(),
    prisma.stylePost.count({ where: { createdAt: { gte: daysAgo(30) } } }),
    prisma.stylePost.count({ where: { reports: { some: {} } } }),
    prisma.stylePost.count({ where: { hiddenAt: { not: null } } }),
    dailyCounts("User", 30),
    dailyCounts("Order", 30),
    dbLatency(),
  ]);

  const byClient = (c: string | null) => active30.find(a => a.lastSeenClient === c)?._count._all ?? 0;
  const web = byClient("web");
  const app = byClient("app");
  const unknown = byClient(null);

  return {
    users: { total: users, tailors, customers, suspended, new7, newPrev7 },
    active: { day: active1, week: active7, month: web + app + unknown, web, app },
    workspace: { businesses, clients, orders, orders30, ordersPrev30, payments30, measurements30 },
    explore: { posts, posts30, reportedPosts, hiddenPosts },
    series: { signups: signupSeries, orders: orderSeries },
    health: {
      db,
      region: process.env.VERCEL_REGION ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      services: [
        { name: "Email (Resend)", ok: !!process.env.RESEND_API_KEY },
        { name: "Photo storage (Blob)", ok: !!process.env.BLOB_READ_WRITE_TOKEN },
        { name: "Sign in with Apple", ok: !!process.env.APPLE_KEY_ID },
        { name: "Google sign-in", ok: !!process.env.GOOGLE_CLIENT_ID },
        { name: "Moderation alerts", ok: !!process.env.MODERATION_EMAIL },
      ],
    },
  };
}

export type Overview = Awaited<ReturnType<typeof overview>>;

export interface Ranked {
  label: string;
  count: number;
  sub?: string;
  href?: string;
}

/** "Top performing": what tailors measure, make and share most. */
export async function insights(range: Range) {
  const from = since(range);

  const [studios, templates, fields, garments, savedPosts, categories, countries, studioCountries] = await Promise.all([
    prisma.$queryRaw<{ id: string; name: string; ownerId: string; country: string; orders: bigint; clients: bigint }[]>`
      SELECT b."id", b."name", b."ownerId", b."country",
        (SELECT COUNT(*) FROM "Order" o WHERE o."businessId" = b."id" AND o."createdAt" >= ${from}) AS orders,
        (SELECT COUNT(*) FROM "Customer" c WHERE c."businessId" = b."id" AND c."createdAt" >= ${from}) AS clients
      FROM "Business" b
      ORDER BY orders DESC, clients DESC, b."createdAt" ASC
      LIMIT 10`,
    prisma.measurementSet.groupBy({
      by: ["templateName"],
      where: { takenAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { templateName: "desc" } },
      take: 10,
    }),
    prisma.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT v."labelSnapshot" AS label, COUNT(*) AS count
      FROM "MeasurementValue" v JOIN "MeasurementSet" s ON s."id" = v."measurementSetId"
      WHERE s."takenAt" >= ${from}
      GROUP BY v."labelSnapshot" ORDER BY count DESC LIMIT 10`,
    prisma.$queryRaw<{ label: string; count: bigint }[]>`
      SELECT i."garmentType" AS label, COUNT(*) AS count
      FROM "OrderItem" i JOIN "Order" o ON o."id" = i."orderId"
      WHERE o."createdAt" >= ${from}
      GROUP BY i."garmentType" ORDER BY count DESC LIMIT 10`,
    prisma.stylePost.findMany({
      where: { createdAt: { gte: from }, saves: { some: {} } },
      orderBy: { saves: { _count: "desc" } },
      take: 8,
      select: { id: true, imageUrl: true, authorName: true, category: true, authorId: true, _count: { select: { saves: true } } },
    }),
    prisma.stylePost.groupBy({
      by: ["category"],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
      take: 10,
    }),
    prisma.stylePost.groupBy({
      by: ["country"],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),
    prisma.business.groupBy({
      by: ["country"],
      where: { createdAt: { gte: from } },
      _count: { _all: true },
      orderBy: { _count: { country: "desc" } },
      take: 10,
    }),
  ]);

  return {
    studios: studios
      .filter(s => num(s.orders) + num(s.clients) > 0)
      .map(s => ({
        label: s.name,
        count: num(s.orders),
        sub: `${num(s.clients)} new clients${s.country ? ` · ${s.country}` : ""}`,
        href: `/users/${s.ownerId}`,
      })) satisfies Ranked[],
    templates: templates.map(t => ({ label: t.templateName, count: t._count._all })) satisfies Ranked[],
    fields: fields.map(f => ({ label: f.label, count: num(f.count) })) satisfies Ranked[],
    garments: garments.map(g => ({ label: g.label, count: num(g.count) })) satisfies Ranked[],
    savedPosts: savedPosts.map(p => ({ ...p, saves: p._count.saves })),
    categories: categories.map(c => ({ label: c.category, count: c._count._all })) satisfies Ranked[],
    postCountries: countries.map(c => ({ label: c.country, count: c._count._all })) satisfies Ranked[],
    studioCountries: studioCountries.map(c => ({ label: c.country || "Not set", count: c._count._all })) satisfies Ranked[],
  };
}
