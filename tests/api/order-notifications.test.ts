import { beforeEach, describe, expect, it, vi } from "vitest";
import * as one from "@/app/api/orders/[id]/route";
import { sendOrderUpdateEmail } from "@/lib/email";
import { notifyOrderStatus } from "@/lib/order-notifications";
import { orderStatusEmail } from "@/lib/email-templates";
import { call, createClient, createOrder, createTailor, createUser, prisma, resetDb } from "../helpers";

const pushes: { to: string; title: string; body: string }[] = [];
vi.mock("@/lib/push", async importOriginal => ({
  ...(await importOriginal<typeof import("@/lib/push")>()),
  sendPush: vi.fn(async (list: typeof pushes) => {
    pushes.push(...list);
    return { sent: list.length, failed: 0 };
  }),
}));

const sent = vi.mocked(sendOrderUpdateEmail);

beforeEach(async () => {
  await resetDb();
  sent.mockClear();
  pushes.length = 0;
});

async function setup(email: string | null = "chioma@example.com") {
  const { user, business } = await createTailor("Kente House");
  const client = await createClient(business.id, { fullName: "Chioma Eze" });
  if (email) await prisma.customer.update({ where: { id: client.id }, data: { email } });
  const order = await createOrder(business.id, client.id, { number: "1042" });
  await prisma.orderItem.updateMany({ where: { orderId: order.id }, data: { garmentType: "Agbada" } });
  return { user, business, order };
}
const move = (id: string, statusName: string) => call(one.PATCH, { method: "PATCH", params: { id }, body: { statusName } });
const settle = () => new Promise(r => setTimeout(r, 50));

describe("order status notifications", () => {
  it("emails the client when the order moves on, with replies going to the tailor", async () => {
    const { user, order } = await setup();
    expect((await move(order.id, "sewing")).status).toBe(200);
    await settle();
    expect(sent).toHaveBeenCalledTimes(1);
    const [to, email, replyTo] = sent.mock.calls[0];
    expect(to).toBe("chioma@example.com");
    expect(replyTo).toBe(user.email);
    expect(email.subject).toBe("Your outfit is being sewn · Kente House");
    expect(email.text).toContain("Hi Chioma,");
    expect(email.text).toContain("Cutting > [Sewing] > Fitting > Ready > Delivered");
    expect(email.text).toContain("Items: Agbada");
  });

  it("tells them each stage once, skips steps backwards, and respects the tailor's switch", async () => {
    const { business, order } = await setup();
    await move(order.id, "sewing");
    await settle();
    await move(order.id, "cutting"); // back a step: not news
    await settle();
    await move(order.id, "sewing"); // already told
    await settle();
    await move(order.id, "ready");
    await settle();
    expect(sent.mock.calls.map(c => c[1].subject.split(" · ")[0])).toEqual(["Your outfit is being sewn", "Your outfit is ready!"]);

    await prisma.business.update({ where: { id: business.id }, data: { notifyClients: false } });
    await move(order.id, "delivered");
    await settle();
    expect(sent).toHaveBeenCalledTimes(2);
  });

  it("doesn't send for pending or without a client email", async () => {
    const { order } = await setup(null);
    await move(order.id, "ready");
    await settle();
    expect(sent).not.toHaveBeenCalled();
    expect(await notifyOrderStatus(order.id)).toBeNull();
  });

  it("pushes to the client's phone if they use the app with the same email", async () => {
    const { order } = await setup("Chioma@Example.com");
    const app = await createUser("customer");
    await prisma.user.update({ where: { id: app.id }, data: { email: "chioma@example.com" } });
    await prisma.pushToken.create({ data: { userId: app.id, token: "ExponentPushToken[chioma]", platform: "android" } });
    await prisma.order.update({ where: { id: order.id }, data: { statusName: "ready" } });
    expect(await notifyOrderStatus(order.id)).toEqual({ email: true, push: 1 });
    expect(pushes).toEqual([expect.objectContaining({ to: "ExponentPushToken[chioma]", title: "Kente House: Your outfit is ready to collect", body: "Order #1042 (Agbada)" })]);
  });

  it("tailors can turn it off", async () => {
    await setup();
    const { PATCH } = await import("@/app/api/business/route");
    const res = await call(PATCH, { method: "PATCH", body: { notifyClients: false } });
    expect(res.body.notifyClients).toBe(false);
  });

  it("every stage has copy; cancelled has no progress track", () => {
    for (const s of ["cutting", "sewing", "fitting", "alterations", "ready", "delivered", "cancelled"]) {
      expect(orderStatusEmail({ customerName: null, businessName: "B", orderNumber: "1", status: s, items: [], dueAt: null })).not.toBeNull();
    }
    expect(orderStatusEmail({ customerName: null, businessName: "B", orderNumber: "1", status: "pending", items: [], dueAt: null })).toBeNull();
    expect(orderStatusEmail({ customerName: null, businessName: "B", orderNumber: "1", status: "cancelled", items: [], dueAt: null })!.text).not.toContain("Cutting >");
  });
});
