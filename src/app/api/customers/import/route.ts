import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

interface ImportItem {
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const items: ImportItem[] = await request.json();

    const rows = items
      .filter(item => item.fullName?.trim())
      .map(item => ({
        businessId: business.id,
        fullName: item.fullName.trim(),
        phones: item.phone ? [item.phone.trim()] : [],
        email: item.email?.trim() || null,
        notes: item.notes?.trim() || null,
        tags: ["Imported"],
      }));

    if (rows.length === 0) return Response.json({ count: 0 });

    const result = await prisma.customer.createMany({ data: rows });
    return Response.json({ count: result.count });
  } catch (error) {
    return errorResponse(error);
  }
}
