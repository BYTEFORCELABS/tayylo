import { prisma } from "@/lib/db";

export async function templateCategories() {
  const rows = await prisma.measurementTemplate.groupBy({ by: ["category"], where: { businessId: null } });
  return rows.map(r => r.category).sort();
}
