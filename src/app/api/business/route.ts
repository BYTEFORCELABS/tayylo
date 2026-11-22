import { prisma } from "@/lib/db";
import { z } from "zod";
import { requireTailorId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { readJson, parse } from "@/lib/validation";

// Logos are stored inline as small data URLs (resized on the client).
const MAX_LOGO_CHARS = 400_000;

/** Keeps only well-formed accounts, with exactly one default when any exist. */
function cleanAccounts(input: unknown[]) {
  const accounts = input
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map(a => ({
      id: typeof a.id === "string" && a.id ? a.id : crypto.randomUUID(),
      bankName: String(a.bankName ?? "").trim().slice(0, 80),
      accountName: String(a.accountName ?? "").trim().slice(0, 120),
      accountNumber: String(a.accountNumber ?? "").trim().slice(0, 40),
      isDefault: a.isDefault === true,
    }))
    .filter(a => a.bankName && a.accountNumber)
    .slice(0, 10);
  const def = accounts.findIndex(a => a.isDefault);
  return accounts.map((a, i) => ({ ...a, isDefault: i === (def < 0 ? 0 : def) }));
}

// Every field is optional (PATCH); only fields present are changed. Values
// of the wrong type are ignored (the long-standing contract both clients
// rely on); well-typed but invalid values — an empty or over-long name,
// over-long text — are a 400.
const ignoreWrongType = <T extends z.ZodType>(schema: T) =>
  z.unknown().transform((v, ctx) => {
    if (v === undefined) return undefined;
    const typeOk = schema.safeParse(v);
    if (typeOk.success) return typeOk.data as z.infer<T>;
    const issue = typeOk.error.issues[0];
    if (issue?.code === "invalid_type" || issue?.code === "invalid_value") return undefined;
    ctx.addIssue({ code: "custom", message: issue?.message ?? "Invalid value" });
    return z.NEVER;
  }).optional();

const bodySchema = z.object({
  name: ignoreWrongType(z.string().trim().min(1, "Enter a business name").max(120, "That name is too long")),
  country: ignoreWrongType(z.string().trim().max(80)),
  currency: ignoreWrongType(z.string().trim().max(10)),
  unitSystem: ignoreWrongType(z.enum(["imperial", "metric"])),
  timezone: ignoreWrongType(z.string().trim().max(80)),
  ownerName: ignoreWrongType(z.string().trim().max(120)),
  garmentTypes: ignoreWrongType(z.array(z.string().trim().min(1).max(60)).max(100)),
  logoUrl: ignoreWrongType(z.string().nullable()),
  bankAccounts: ignoreWrongType(z.array(z.unknown()).max(50)),
});

export async function GET() {
  try {
    const userId = await requireTailorId();
    const business = await prisma.business.findUnique({ where: { ownerId: userId } });
    return Response.json(business);
  } catch (error) {
    return errorResponse(error);
  }
}

// Upsert — onboarding calls this before any Business row exists; Settings
// calls it afterward to edit it. Only the fields present in the body are
// changed on an existing row.
export async function PATCH(request: Request) {
  try {
    const userId = await requireTailorId();
    const body = parse(bodySchema, await readJson(request));

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.country !== undefined) data.country = body.country;
    if (body.currency !== undefined) data.currency = body.currency;
    if (body.unitSystem !== undefined) data.unitSystem = body.unitSystem;
    if (body.timezone !== undefined) data.timezone = body.timezone;
    if (body.ownerName !== undefined) data.ownerName = body.ownerName;
    if (body.garmentTypes !== undefined) data.garmentTypes = body.garmentTypes;
    if (body.logoUrl === null) data.logoUrl = null;
    else if (typeof body.logoUrl === "string") {
      if (!body.logoUrl.startsWith("data:image/")) throw new ApiError(400, "Logo must be an image");
      if (body.logoUrl.length > MAX_LOGO_CHARS) throw new ApiError(413, "That logo is too large");
      data.logoUrl = body.logoUrl;
    }
    if (Array.isArray(body.bankAccounts)) data.bankAccounts = cleanAccounts(body.bankAccounts);

    const business = await prisma.business.upsert({
      where: { ownerId: userId },
      create: { ownerId: userId, name: typeof data.name === "string" ? data.name : "My Atelier", ...data },
      update: data,
    });

    return Response.json(business);
  } catch (error) {
    return errorResponse(error);
  }
}
