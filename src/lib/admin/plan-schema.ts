import { z } from "zod";

export const priceInput = z.object({
  interval: z.enum(["monthly", "yearly"]),
  currency: z.string().trim().toUpperCase().length(3),
  amountMinor: z.number().int().min(100).max(1_000_000_000),
});

export const planInput = z.object({
  name: z.string().trim().min(1).max(40),
  tagline: z.string().trim().max(120).default(""),
  features: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  maxClients: z.number().int().min(1).max(1_000_000).nullable(),
  customBranding: z.boolean(),
  explorePosting: z.boolean(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(100).default(0),
  revenuecatEntitlement: z.string().trim().max(60).nullable().default(null),
  prices: z.array(priceInput).max(20).default([]),
});
export type PlanInput = z.infer<typeof planInput>;
