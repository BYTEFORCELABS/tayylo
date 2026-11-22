import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { normalizeStatus } from "@/lib/orders";
import { dateString, id, imageUrl, moneyMinor, optionalText, positiveMoneyMinor, readBody, text } from "@/lib/validation";

const ORDER_INCLUDE = {
  items: true,
  payments: true,
  fittings: { include: { adjustments: true } },
} as const;

export async function GET(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const customerId = new URL(request.url).searchParams.get("customerId") || undefined;
    const orders = await prisma.order.findMany({
      where: { businessId: business.id, ...(customerId ? { customerId } : {}) },
      include: ORDER_INCLUDE,
      orderBy: { dueAt: "asc" },
    });
    return Response.json(orders);
  } catch (error) {
    return errorResponse(error);
  }
}

const itemSchema = z.object({
  garmentType: text(80),
  // Clients send "" when the client has no measurements yet.
  measurementSetId: z.string().max(64).nullish().transform(v => v || null),
  styleNotes: optionalText(2000),
  photos: z.array(z.string().max(64)).max(20).optional().default([]),
  imageUrl: imageUrl.nullish().or(z.literal("")).transform(v => v || null),
});

const paymentSchema = z.object({
  amountMinor: positiveMoneyMinor,
  method: text(40),
  reference: optionalText(120),
  paidAt: dateString.optional(),
});

const createSchema = z.object({
  customerId: id,
  customerName: z.string().trim().max(160).optional(),
  statusName: z.string().optional(),
  dueAt: dateString,
  note: optionalText(2000),
  priceMinor: moneyMinor.optional().default(0),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/, "Must be a 3-letter currency code").optional().default("NGN"),
  items: z.array(itemSchema).min(1, "Add at least one garment").max(20),
  payments: z.array(paymentSchema).max(20).optional().default([]),
});

/**
 * Next order number for a business: one more than the highest purely
 * numeric number it already has (starting at 1001). Must run inside the
 * transaction holding the business's advisory lock, so two orders created
 * at the same moment can't get the same number.
 */
async function nextOrderNumber(tx: Prisma.TransactionClient, businessId: string): Promise<string> {
  const rows = await tx.$queryRaw<{ max: bigint | null }[]>`
    SELECT MAX(number::bigint) AS max FROM "Order"
    WHERE "businessId" = ${businessId} AND number ~ '^[0-9]{1,15}$'`;
  const max = rows[0]?.max == null ? 1000 : Number(rows[0].max);
  return String(Math.max(max, 1000) + 1);
}

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const body = await readBody(request, createSchema);

    // Every id the client sends must belong to this business.
    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } });
    if (!customer || customer.businessId !== business.id) throw new ApiError(404, "Client not found");

    const setIds = [...new Set(body.items.map(i => i.measurementSetId).filter((v): v is string => !!v))];
    if (setIds.length) {
      const owned = await prisma.measurementSet.count({ where: { id: { in: setIds }, businessId: business.id } });
      if (owned !== setIds.length) throw new ApiError(404, "Measurements not found");
    }

    const paid = body.payments.reduce((sum, p) => sum + p.amountMinor, 0);
    // A price of 0 means "not agreed yet" — a deposit is still allowed then.
    if (body.priceMinor > 0 && paid > body.priceMinor) throw new ApiError(400, "The deposit is more than the price");

    const statusName = body.statusName === undefined ? "pending" : normalizeStatus(body.statusName);
    if (!statusName) throw new ApiError(400, "Unknown order status");

    const order = await prisma.$transaction(async tx => {
      // Serialises order creation per business (released at commit).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${business.id}))`;
      const number = await nextOrderNumber(tx, business.id);
      return tx.order.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          customerName: body.customerName || customer.fullName,
          number,
          statusName,
          dueAt: new Date(body.dueAt),
          note: body.note,
          priceMinor: body.priceMinor,
          currency: body.currency.toUpperCase(),
          items: {
            create: body.items.map(i => ({
              garmentType: i.garmentType,
              measurementSetId: i.measurementSetId,
              styleNotes: i.styleNotes,
              photos: i.photos,
              imageUrl: i.imageUrl,
            })),
          },
          payments: {
            create: body.payments.map(p => ({
              amountMinor: p.amountMinor,
              paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
              method: p.method,
              reference: p.reference,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    return Response.json(order, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
