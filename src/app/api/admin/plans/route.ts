import { z } from "zod";
import { prisma } from "@/lib/db";
import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { audit, requireStaff } from "@/lib/admin/auth";

const schema = z.object({
  key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_-]{1,29}$/, "Use lowercase letters, numbers and dashes"),
  name: z.string().trim().min(1).max(40),
});

// A new (inactive) plan; prices and limits are set on its page.
export async function POST(request: Request) {
  try {
    const staff = await requireStaff("owner");
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid plan");
    if (await prisma.plan.findUnique({ where: { key: parsed.data.key } })) throw new ApiError(409, "A plan with that key exists");
    const count = await prisma.plan.count();
    const plan = await prisma.plan.create({ data: { ...parsed.data, active: false, sortOrder: count, maxClients: null, customBranding: true } });
    await audit(staff, { action: "plan.create", targetType: "plan", targetId: plan.key, summary: `Created the plan ${plan.name}` });
    return Response.json(plan, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
