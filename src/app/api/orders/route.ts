import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse } from "@/lib/auth-helpers";

const ORDER_INCLUDE = {
  items: true,
  payments: true,
  fittings: { include: { adjustments: true } },
} as const;

export async function GET() {
  try {
    const { business } = await requireUserAndBusiness();
    const orders = await prisma.order.findMany({
      where: { businessId: business.id },
      include: ORDER_INCLUDE,
      orderBy: { dueAt: "asc" },
    });
    return Response.json(orders);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const body = await request.json();

    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        customerId: body.customerId,
        customerName: body.customerName,
        number: body.number,
        statusName: body.statusName ?? "pending",
        dueAt: new Date(body.dueAt),
        note: body.note || null,
        priceMinor: body.priceMinor ?? 0,
        currency: body.currency ?? "NGN",
        items: {
          create: (body.items ?? []).map((i: { garmentType: string; measurementSetId?: string; styleNotes?: string; photos?: string[]; imageUrl?: string }) => ({
            garmentType: i.garmentType,
            measurementSetId: i.measurementSetId || null,
            styleNotes: i.styleNotes || null,
            photos: i.photos ?? [],
            imageUrl: i.imageUrl || null,
          })),
        },
        payments: {
          create: (body.payments ?? []).map((p: { amountMinor: number; paidAt?: string; method: string; reference?: string }) => ({
            amountMinor: p.amountMinor,
            paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
            method: p.method,
            reference: p.reference || null,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    return Response.json(order, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
