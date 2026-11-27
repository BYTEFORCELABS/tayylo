import { prisma } from "@/lib/db";
import { assertPlanAllows } from "@/lib/billing/plans";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";
import { mediaMapForBusiness } from "@/lib/media";
import { customerCreateSchema } from "@/lib/customer-schema";
import { readBody } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    // Photos are stored inline (data URLs) and can be megabytes per client,
    // so lists leave them out unless explicitly asked for (e.g. export).
    const includeMedia = url.searchParams.get("include") === "media";

    const [rows, mediaMap, lastMeasured] = await Promise.all([
      prisma.customer.findMany({
        where: { businessId: business.id },
        orderBy: { fullName: "asc" },
      }),
      includeMedia ? mediaMapForBusiness(business.id) : Promise.resolve(null),
      prisma.measurementSet.groupBy({
        by: ["customerId"],
        where: { businessId: business.id },
        _max: { takenAt: true },
      }),
    ]);
    const lastMap = new Map(lastMeasured.map(r => [r.customerId, r._max.takenAt]));
    const customers = rows.map(c => ({
      ...c,
      lastMeasuredAt: lastMap.get(c.id) ?? null,
      ...(mediaMap ? { media: mediaMap[c.id] ?? [] } : {}),
    }));

    if (!q) return Response.json(customers);

    const filtered = customers.filter(
      c =>
        c.fullName.toLowerCase().includes(q) ||
        c.phones.some(p => p.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
    return Response.json(filtered);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { userId, business } = await requireUserAndBusiness();
    const body = await readBody(request, customerCreateSchema);
    await assertPlanAllows(userId, "addClients", { businessId: business.id });

    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        fullName: body.fullName,
        phones: body.phones,
        email: body.email,
        tags: body.tags,
        notes: body.notes,
        photoUrl: body.photoUrl,
      },
    });
    return Response.json({ ...customer, media: [] }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
