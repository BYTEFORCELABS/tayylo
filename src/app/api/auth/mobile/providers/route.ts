import { appleNativeEnabled, appleWebEnabled } from "@/lib/apple";
import { googleEnabled } from "@/lib/google";

/** Which sign-in buttons the mobile app should offer (public, no session needed). */
export async function GET() {
  return Response.json(
    { google: googleEnabled(), apple: appleWebEnabled(), appleNative: appleNativeEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
