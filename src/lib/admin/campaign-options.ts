import { prisma } from "@/lib/db";

/** Choices for the campaign audience pickers. */
export async function campaignOptions() {
  const [plans, countries] = await Promise.all([
    prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, select: { key: true, name: true } }),
    prisma.business.groupBy({ by: ["country"], where: { country: { not: "" } }, _count: { _all: true }, orderBy: { _count: { country: "desc" } }, take: 30 }),
  ]);
  return { plans, countries: countries.map(c => c.country) };
}
