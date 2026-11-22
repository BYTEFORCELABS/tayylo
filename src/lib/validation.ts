import { z } from "zod";
import { ApiError } from "@/lib/auth-helpers";

// Request-body validation shared by every Route Handler. Bad input must come
// back as a 400 with a readable message — never reach Prisma and surface as
// a 500 "Something went wrong".

/** Parses the JSON body, or throws a 400 when it isn't valid JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "The request body isn't valid JSON");
  }
}

/** Validates `data` against `schema`, throwing a 400 with the first problem. */
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    throw new ApiError(400, `${field}${issue?.message ?? "Invalid request"}`);
  }
  return result.data;
}

/** readJson + parse in one step. */
export async function readBody<T extends z.ZodType>(request: Request, schema: T): Promise<z.infer<T>> {
  return parse(schema, await readJson(request));
}

// ---------------------------------------------------------------- shared field schemas

/** Inline photos are resized on the client; anything bigger is a mistake or abuse. */
export const MAX_IMAGE_CHARS = 2_000_000; // ≈1.5 MB of image data as base64

/** An image the app can display: an inline `data:image/*` URL or an https URL. */
export const imageUrl = z
  .string()
  .max(MAX_IMAGE_CHARS, "That photo is too large")
  .refine(u => /^data:image\/[a-z0-9.+-]+;base64,/i.test(u) || /^https:\/\//i.test(u), "Must be an image");

/** Whole minor units (kobo, cents), zero or more. */
export const moneyMinor = z.number().int("Must be a whole amount in minor units").min(0, "Can't be negative").max(1e13);

/** Whole minor units, more than zero. */
export const positiveMoneyMinor = z.number().int("Must be a whole amount in minor units").positive("Must be more than zero").max(1e13);

/** Any string `new Date()` understands as a real date. */
export const dateString = z
  .string()
  .refine(s => !Number.isNaN(new Date(s).getTime()), "Must be a valid date");

/** Non-empty trimmed text with a length cap. */
export const text = (max: number) => z.string().trim().min(1, "Can't be empty").max(max);

/** Optional free text: empty strings and null become null. */
export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullish()
    .transform(v => (v && v.trim() ? v : null));

export const id = z.string().min(1).max(64);
