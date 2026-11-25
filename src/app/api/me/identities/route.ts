import { requireUserId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { appleNativeEnabled, appleWebEnabled } from "@/lib/apple";
import { listSignInMethods } from "@/lib/identity";

/** Sign-in methods on the signed-in account, for Settings. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const methods = await listSignInMethods(userId);
    if (!methods) throw new ApiError(401, "Not signed in");
    return Response.json({
      ...methods,
      available: {
        appleWeb: appleWebEnabled(),
        appleNative: appleNativeEnabled(),
        google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
