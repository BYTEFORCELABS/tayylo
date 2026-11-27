import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { requireStaff } from "@/lib/admin/auth";
import { audienceSchema, estimateAudience } from "@/lib/marketing/audience";

export async function POST(request: Request) {
  try {
    await requireStaff("admin");
    const parsed = audienceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "Invalid audience");
    return Response.json(await estimateAudience(parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
