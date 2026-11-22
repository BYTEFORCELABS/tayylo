import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSession } from "./session-state";

export { prisma };

// ---------------------------------------------------------------- database

/** Empties every app table (keeps the schema). Call in beforeEach. */
export async function resetDb() {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map(r => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  }
  setSession(null);
}

// ---------------------------------------------------------------- sessions

export type Role = "tailor" | "customer";
export interface TestUser {
  id: string;
  email: string;
  role: Role;
  password: string;
}

export function signInAs(user: Pick<TestUser, "id" | "email" | "role">) {
  setSession({ user: { id: user.id, email: user.email, role: user.role } });
}
export function signOut() {
  setSession(null);
}

// ---------------------------------------------------------------- factories

let seq = 0;
const next = () => `${Date.now().toString(36)}${(++seq).toString(36)}`;

export async function createUser(role: Role = "tailor", password = "Password123!"): Promise<TestUser> {
  const email = `user-${next()}@test.local`;
  // Low bcrypt cost keeps tests fast; production uses 12.
  const user = await prisma.user.create({ data: { email, role, passwordHash: await bcrypt.hash(password, 4) } });
  return { id: user.id, email, role, password };
}

/** A tailor with a business, signed in. */
export async function createTailor(name = "Atelier") {
  const user = await createUser("tailor");
  const business = await prisma.business.create({ data: { ownerId: user.id, name, currency: "NGN", unitSystem: "metric" } });
  signInAs(user);
  return { user, business };
}

export async function createClient(businessId: string, data: { fullName?: string; phones?: string[] } = {}) {
  return prisma.customer.create({
    data: { businessId, fullName: data.fullName ?? `Client ${next()}`, phones: data.phones ?? [] },
  });
}

/** A global (system) template, like the ones prisma/seed.ts creates. */
export async function createTemplate(businessId: string | null = null, name = "Shirt") {
  return prisma.measurementTemplate.create({
    data: {
      businessId,
      name,
      category: "Western",
      fields: {
        create: [
          { key: "chest", label: "Chest", group: "Torso", minMm: 700, maxMm: 1500, sortOrder: 0 },
          { key: "waist", label: "Waist", group: "Torso", minMm: 600, maxMm: 1400, sortOrder: 1 },
        ],
      },
    },
    include: { fields: true },
  });
}

export async function createMeasurementSet(businessId: string, customerId: string, templateId: string) {
  return prisma.measurementSet.create({
    data: {
      businessId,
      customerId,
      templateId,
      templateName: "Shirt",
      source: "manual",
      status: "final",
      values: { create: [{ fieldKey: "chest", labelSnapshot: "Chest", valueMm: 1000, rawInput: "100" }] },
    },
    include: { values: true },
  });
}

export async function createOrder(businessId: string, customerId: string, extra: { priceMinor?: number; number?: string } = {}) {
  return prisma.order.create({
    data: {
      businessId,
      customerId,
      customerName: "Client",
      number: extra.number ?? `ORD-${next()}`,
      statusName: "pending",
      dueAt: new Date(Date.now() + 7 * 864e5),
      priceMinor: extra.priceMinor ?? 100_000,
      currency: "NGN",
      items: { create: [{ garmentType: "Shirt" }] },
    },
  });
}

// ---------------------------------------------------------------- requests

type Params = Record<string, string>;
type Handler<P extends Params> = (req: Request, ctx: { params: Promise<P> }) => Promise<Response> | Response;

/**
 * Calls a Route Handler the way Next.js does: a real Request plus a
 * `{ params: Promise }` context. Returns status and parsed JSON body.
 */
export async function call<P extends Params = Params>(
  handler: Handler<P>,
  opts: { method?: string; path?: string; body?: unknown; rawBody?: BodyInit; headers?: Record<string, string>; params?: P } = {},
) {
  const url = `http://localhost:3000${opts.path ?? "/api/test"}`;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  let body: BodyInit | undefined = opts.rawBody;
  if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["Content-Type"] ??= "application/json";
  }
  const req = new Request(url, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: res.status, body: json as any };
}
