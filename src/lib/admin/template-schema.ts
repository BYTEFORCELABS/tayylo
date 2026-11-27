import { z } from "zod";

export const templateFieldInput = z
  .object({
    key: z.string().trim().toLowerCase().regex(/^[a-z][a-z0-9_]{0,39}$/, "Field keys use lowercase letters, numbers and _"),
    label: z.string().trim().min(1).max(40),
    group: z.string().trim().min(1).max(30),
    minMm: z.number().int().min(10).max(3000).nullable(),
    maxMm: z.number().int().min(10).max(3000).nullable(),
  })
  .refine(f => f.minMm === null || f.maxMm === null || f.minMm < f.maxMm, "Each field's minimum must be below its maximum");

export const templateInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    category: z.string().trim().min(1).max(40),
    fields: z.array(templateFieldInput).min(1, "Add at least one measurement").max(60),
  })
  .refine(t => new Set(t.fields.map(f => f.key)).size === t.fields.length, "Field keys must be unique");
