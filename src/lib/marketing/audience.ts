import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { defaultPlan, liveSubscriptionWhere } from "@/lib/billing/plans";

/** Who a campaign goes to. Empty lists mean "everyone". */
export const audienceSchema = z.object({
  roles: z.array(z.enum(["tailor", "customer"])).default([]),
  plans: z.array(z.string().min(1).max(40)).max(20).default([]),
  countries: z.array(z.string().min(1).max(60)).max(50).default([]),
  activeWithinDays: z.number().int().positive().max(3650).nullable().default(null),
});
export type Audience = z.infer<typeof audienceSchema>;

export const parseAudience = (v: unknown): Audience => audienceSchema.parse(v ?? {});

/** Everyone the filters select (before channel preferences). */
export async function audienceWhere(a: Audience): Promise<Prisma.UserWhereInput> {
  const and: Prisma.UserWhereInput[] = [{ suspendedAt: null }];
  if (a.roles.length) and.push({ role: { in: a.roles } });
  if (a.countries.length) and.push({ business: { is: { country: { in: a.countries } } } });
  if (a.activeWithinDays) and.push({ lastSeenAt: { gte: new Date(Date.now() - a.activeWithinDays * 864e5) } });
  if (a.plans.length) {
    const free = (await defaultPlan()).key;
    const live = liveSubscriptionWhere();
    const or: Prisma.UserWhereInput[] = [];
    for (const key of a.plans) {
      if (key === free) {
        or.push({ subscription: { is: null } }, { subscription: { is: { NOT: live } } }, { subscription: { is: { ...live, plan: { isDefault: true } } } });
      } else {
        or.push({ subscription: { is: { ...live, planKey: key } } });
      }
    }
    and.push({ OR: or });
  }
  return { AND: and };
}

export const emailableWhere: Prisma.UserWhereInput = { marketingEmails: true };
export const pushableWhere: Prisma.UserWhereInput = { pushNotifications: true, pushTokens: { some: {} } };

/** Recipients for the chosen channels: reachable by at least one of them. */
export async function recipientsWhere(a: Audience, channels: { email: boolean; push: boolean }): Promise<Prisma.UserWhereInput> {
  const reach: Prisma.UserWhereInput[] = [];
  if (channels.email) reach.push(emailableWhere);
  if (channels.push) reach.push(pushableWhere);
  return { AND: [await audienceWhere(a), reach.length ? { OR: reach } : { id: "__none__" }] };
}

/** Audience size, split by channel, for the campaign editor. */
export async function estimateAudience(a: Audience) {
  const base = await audienceWhere(a);
  const [total, email, push] = await Promise.all([
    prisma.user.count({ where: base }),
    prisma.user.count({ where: { AND: [base, emailableWhere] } }),
    prisma.user.count({ where: { AND: [base, pushableWhere] } }),
  ]);
  return { total, email, push };
}
