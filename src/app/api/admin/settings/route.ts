import { errorResponse, ApiError } from "@/lib/auth-helpers";
import { appSettingsSchema, getAppSettings, updateAppSettings, type AppSettings } from "@/lib/app-settings";
import { audit, requireStaff } from "@/lib/admin/auth";

export async function GET() {
  try {
    await requireStaff("moderator");
    return Response.json(await getAppSettings());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaff("admin");
    const parsed = appSettingsSchema.partial().strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid settings");

    const before = await getAppSettings();
    const changed = Object.fromEntries(
      Object.entries(parsed.data).filter(([k, v]) => before[k as keyof AppSettings] !== v),
    ) as Partial<AppSettings>;
    if (!Object.keys(changed).length) return Response.json(before);

    const after = await updateAppSettings(changed, staff.email);
    await audit(staff, {
      action: "settings.update",
      targetType: "settings",
      summary: `Changed ${Object.keys(changed).join(", ")}`,
      meta: { from: Object.fromEntries(Object.keys(changed).map(k => [k, before[k as keyof AppSettings]])), to: changed },
    });
    return Response.json(after);
  } catch (error) {
    return errorResponse(error);
  }
}
