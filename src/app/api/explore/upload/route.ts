import { put } from "@vercel/blob";
import { requireTailorId, errorResponse, ApiError } from "@/lib/auth-helpers";

// Vercel rejects Function request bodies over ~4.5 MB before the route runs,
// so cap below that. Both clients resize to ≤1600px JPEG first (well under).
const MAX_BYTES = 4 * 1024 * 1024;

// Style photos live in Vercel Blob (public URLs), not in the database.
export async function POST(request: Request) {
  try {
    const userId = await requireTailorId();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, "Photo storage isn't set up yet (missing BLOB_READ_WRITE_TOKEN)");
    }
    const form = await request.formData().catch(() => {
      throw new ApiError(400, "Choose an image");
    });
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) throw new ApiError(400, "Choose an image");
    if (file.size > MAX_BYTES) throw new ApiError(413, "That photo is too large");

    const blob = await put(`explore/${userId}/${crypto.randomUUID()}.jpg`, file, {
      access: "public",
      contentType: "image/jpeg",
    });
    return Response.json({ url: blob.url });
  } catch (error) {
    return errorResponse(error);
  }
}
