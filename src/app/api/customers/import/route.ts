import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserAndBusiness, errorResponse, ApiError } from "@/lib/auth-helpers";
import { parse, readJson } from "@/lib/validation";

/** More rows than any real client list; protects the database from runaway imports. */
const MAX_ROWS = 5_000;

// One CSV row as the import dialogs send it. Rows with a blank name are
// skipped (header rows, empty lines), but a row of the wrong shape is an error.
const field = (max: number) => z.string().max(max).nullish();
const rowSchema = z.object(
  {
    fullName: field(200),
    phone: field(60),
    email: field(254),
    notes: field(5000),
  },
  { error: "Each row must be an object" },
);
const bodySchema = z.array(rowSchema, { error: "Send a list of clients" });

export async function POST(request: Request) {
  try {
    const { business } = await requireUserAndBusiness();
    const raw = await readJson(request);
    if (Array.isArray(raw) && raw.length > MAX_ROWS) {
      throw new ApiError(413, `You can import up to ${MAX_ROWS.toLocaleString("en-US")} clients at a time`);
    }
    const items = parse(bodySchema, raw);

    const rows = items
      .filter(item => item.fullName?.trim())
      .map(item => ({
        businessId: business.id,
        fullName: item.fullName!.trim(),
        phones: item.phone?.trim() ? [item.phone.trim()] : [],
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
