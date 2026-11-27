import { after } from "next/server";
import { prisma } from "@/lib/db";
import { sendOrderUpdateEmail } from "@/lib/email";
import { sendPush } from "@/lib/push";
import { orderStatusEmail, orderStatusPush, type OrderUpdate } from "@/lib/email-templates";
import { normalizeStatus } from "@/lib/orders";

/** Stages worth telling a client about ("pending" is just the order being booked). */
const NOTIFY = new Set(["cutting", "sewing", "fitting", "alterations", "ready", "delivered", "cancelled"]);
const STAGE_RANK: Record<string, number> = { cutting: 1, sewing: 2, fitting: 3, alterations: 4, ready: 5, delivered: 6 };

/**
 * Tells the client their order moved to a new stage: by email if the tailor
 * saved one, and by push if that email belongs to someone signed in to the
 * Tayylo app. Runs after the response; never throws. Each stage is sent at
 * most once per order, so flicking a status back and forth doesn't spam.
 */
export async function notifyOrderStatus(orderId: string): Promise<{ email: boolean; push: number } | null> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true, email: true } },
        business: { select: { name: true, notifyClients: true, owner: { select: { email: true } } } },
        items: { select: { garmentType: true } },
      },
    });
    const status = normalizeStatus(order?.statusName);
    if (!order || !status || !NOTIFY.has(status) || !order.business.notifyClients) return null;

    const email = order.customer.email?.trim().toLowerCase() || null;
    if (!email) return null;

    // Moving back a step (a slip of the finger, or redoing a fitting) isn't news.
    const rank = (k: string | null) => (k ? STAGE_RANK[k] ?? -1 : -1);
    if (status !== "cancelled" && rank(order.clientNotifiedStatus) > rank(status)) return null;

    // Claim this stage first, so two quick saves can't both send it.
    const claimed = await prisma.order.updateMany({
      where: { id: order.id, statusName: order.statusName, OR: [{ clientNotifiedStatus: null }, { clientNotifiedStatus: { not: status } }] },
      data: { clientNotifiedStatus: status },
    });
    if (!claimed.count) return null;

    const update: OrderUpdate = {
      customerName: order.customer.fullName,
      businessName: order.business.name,
      orderNumber: order.number,
      status,
      items: [...new Set(order.items.map(i => i.garmentType).filter(Boolean))],
      dueAt: order.dueAt,
    };

    const rendered = orderStatusEmail(update);
    if (rendered) await sendOrderUpdateEmail(email, rendered, order.business.owner.email);

    // Push only reaches people with the app, signed in with the same email.
    let push = 0;
    const p = orderStatusPush(update);
    if (p) {
      const tokens = await prisma.pushToken.findMany({
        where: { user: { email: { equals: email, mode: "insensitive" }, suspendedAt: null } },
        select: { token: true },
      });
      if (tokens.length) push = (await sendPush(tokens.map(t => ({ to: t.token, ...p, data: { type: "order-status", orderNumber: order.number, status } })))).sent;
    }
    return { email: !!rendered, push };
  } catch (err) {
    console.error("[order-notify]", orderId, (err as Error).message);
    return null;
  }
}

/** Runs the notification after the response is sent (or straight away outside a request, e.g. tests). */
export function notifyOrderStatusLater(orderId: string) {
  try {
    after(() => notifyOrderStatus(orderId));
  } catch {
    void notifyOrderStatus(orderId);
  }
}
