import { prisma } from "@/lib/db";

/**
 * Media is a polymorphic table (ownerType/ownerId), not a direct Prisma
 * relation on Customer/Order/Fitting, so it's fetched and attached
 * separately rather than via `include`.
 */
export async function mediaMapForBusiness(businessId: string, ownerType = "customer") {
  const rows = await prisma.media.findMany({
    where: { businessId, ownerType },
    orderBy: { createdAt: "desc" },
  });
  const map: Record<string, typeof rows> = {};
  for (const row of rows) {
    (map[row.ownerId] ||= []).push(row);
  }
  return map;
}

export async function mediaForOwner(businessId: string, ownerType: string, ownerId: string) {
  return prisma.media.findMany({
    where: { businessId, ownerType, ownerId },
    orderBy: { createdAt: "desc" },
  });
}
