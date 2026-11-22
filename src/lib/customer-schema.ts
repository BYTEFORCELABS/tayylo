import { z } from "zod";
import { imageUrl, optionalText, text } from "@/lib/validation";

// Request bodies for POST /api/customers and PATCH /api/customers/[id].
// Unknown keys (id, businessId, media, lastMeasuredAt… that clients echo
// back from a fetched Customer) are stripped, never written.

const shortList = (label: string) =>
  z
    .array(z.string().trim().max(60, `Each ${label} must be 60 characters or fewer`), {
      error: `${label}s must be a list`,
    })
    .max(30, `Too many ${label}s`)
    .transform(list => list.filter(Boolean));

/** "" and null clear the photo; anything else must be a real image. */
const photoUrl = z.preprocess(v => (v === "" ? null : v), imageUrl.nullish()).transform(v => v ?? null);

export const customerCreateSchema = z.object({
  fullName: text(200),
  phones: shortList("phone").default([]),
  email: optionalText(254),
  tags: shortList("tag").default([]),
  notes: optionalText(5000),
  photoUrl: photoUrl.optional().transform(v => v ?? null),
});

/** Every field optional; an absent field is left unchanged. */
export const customerPatchSchema = z.object({
  fullName: text(200).optional(),
  phones: shortList("phone").optional(),
  email: optionalText(254).optional(),
  tags: shortList("tag").optional(),
  notes: optionalText(5000).optional(),
  photoUrl: photoUrl.optional(),
});
