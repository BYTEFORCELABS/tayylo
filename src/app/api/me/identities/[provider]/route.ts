import { prisma } from "@/lib/db";
import { requireUserId, errorResponse, ApiError } from "@/lib/auth-helpers";
import { AppleNativeError, appleNativeSignIn } from "@/lib/apple-native";
import { listSignInMethods, revokeProviderTokens } from "@/lib/identity";

type Params = { params: Promise<{ provider: string }> };

const LINK_ERRORS: Record<string, { status: number; message: string }> = {
  identity_taken: { status: 409, message: "This Apple ID is already connected to another Tayylo account." },
  provider_already_linked: { status: 409, message: "A different Apple ID is already connected to this account." },
  nonce_expired: { status: 400, message: "That took too long. Please try again." },
  invalid_token: { status: 400, message: "Apple couldn't confirm it's you. Please try again." },
  not_configured: { status: 503, message: "Sign in with Apple isn't available yet." },
};

/**
 * Connect Apple to the signed-in account from the iOS app (the web links
 * through the normal Apple redirect with a link intent instead). Same
 * verification as native sign-in: identity token + server-issued nonce.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { provider } = await params;
    if (provider !== "apple") throw new ApiError(404, "Unknown sign-in method");
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    try {
      await appleNativeSignIn(body ?? undefined, request.headers.get("cookie"), { linkToUserId: userId });
    } catch (e) {
      if (e instanceof AppleNativeError) {
        const mapped = LINK_ERRORS[e.code] ?? { status: 400, message: "Couldn't connect Apple. Please try again." };
        throw new ApiError(mapped.status, mapped.message);
      }
      throw e;
    }
    return Response.json(await listSignInMethods(userId));
  } catch (error) {
    return errorResponse(error);
  }
}

/** Disconnect a provider — only if the account can still be signed in to afterwards. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const userId = await requireUserId();
    const { provider } = await params;
    if (provider !== "apple" && provider !== "google") throw new ApiError(404, "Unknown sign-in method");

    const methods = await listSignInMethods(userId);
    if (!methods) throw new ApiError(401, "Not signed in");
    if (!methods.identities.some(i => i.provider === provider)) throw new ApiError(404, "Not connected");
    const remaining = methods.identities.filter(i => i.provider !== provider).length + (methods.hasPassword ? 1 : 0);
    if (remaining === 0) {
      throw new ApiError(409, "Set a password first (use \"Forgot password?\" on the sign-in screen) so you can still sign in.");
    }

    await revokeProviderTokens(userId, provider);
    await prisma.authIdentity.deleteMany({ where: { userId, provider } });
    return Response.json(await listSignInMethods(userId));
  } catch (error) {
    return errorResponse(error);
  }
}
