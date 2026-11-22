import { beforeEach, describe, expect, it } from "vitest";
import * as route from "@/app/api/business/route";
import { call, createTailor, createUser, prisma, resetDb, signInAs, signOut } from "../helpers";

beforeEach(resetDb);

const patch = (body: unknown) => call(route.PATCH, { method: "PATCH", path: "/api/business", body });

describe("GET /api/business", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await call(route.GET)).status).toBe(401);
  });

  it("null before onboarding", async () => {
    signInAs(await createUser("tailor"));
    const res = await call(route.GET);
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("returns the caller's own business only", async () => {
    await createTailor("Other");
    const { business } = await createTailor("Mine");
    const res = await call(route.GET);
    expect(res.body).toMatchObject({ id: business.id, name: "Mine" });
  });
});

describe("PATCH /api/business", () => {
  it("401 when signed out", async () => {
    signOut();
    expect((await patch({ name: "X" })).status).toBe(401);
  });

  it("creates the business on first call (onboarding)", async () => {
    const u = await createUser("tailor");
    signInAs(u);
    const res = await patch({ name: "QA Atelier", country: "NG", currency: "NGN", unitSystem: "metric", ownerName: "Ada", garmentTypes: ["Agbada"], timezone: "Africa/Lagos" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ownerId: u.id, name: "QA Atelier", country: "NG", unitSystem: "metric", ownerName: "Ada", garmentTypes: ["Agbada"], timezone: "Africa/Lagos" });
    expect(await prisma.business.count()).toBe(1);
  });

  it("defaults the name to My Atelier when creating without one", async () => {
    signInAs(await createUser("tailor"));
    const res = await patch({ currency: "GHS" });
    expect(res.body).toMatchObject({ name: "My Atelier", currency: "GHS" });
  });

  it("updates only the fields sent", async () => {
    const { business } = await createTailor("Before");
    const res = await patch({ ownerName: "Bola" });
    expect(res.body).toMatchObject({ id: business.id, name: "Before", ownerName: "Bola", currency: "NGN", unitSystem: "metric" });
  });

  it("ignores an invalid unitSystem and wrongly-typed fields", async () => {
    await createTailor();
    const res = await patch({ unitSystem: "cubits", name: 42, garmentTypes: "Shirt" });
    expect(res.body).toMatchObject({ unitSystem: "metric", name: "Atelier", garmentTypes: [] });
  });

  it("cannot be used to take over another user's business", async () => {
    const other = await createTailor("Theirs");
    await createTailor("Mine");
    await patch({ name: "Renamed", ownerId: other.user.id, id: other.business.id });
    expect((await prisma.business.findUniqueOrThrow({ where: { id: other.business.id } })).name).toBe("Theirs");
  });

  it("400 for an empty business name", async () => {
    await createTailor();
    expect((await patch({ name: "   " })).status).toBe(400);
  });

  it("400 (not a silent upsert) on malformed JSON", async () => {
    signInAs(await createUser("tailor"));
    const res = await call(route.PATCH, { method: "PATCH", rawBody: "{bad", headers: { "Content-Type": "application/json" } });
    expect(res.status).toBe(400);
    expect(await prisma.business.count()).toBe(0);
  });

  it("403 for a customer-role account", async () => {
    signInAs(await createUser("customer"));
    const res = await patch({ name: "Customer Shop" });
    expect(res.status).toBe(403);
    expect(await prisma.business.count()).toBe(0);
  });

  describe("logo", () => {
    it("accepts an image data URL and clears with null", async () => {
      await createTailor();
      const logo = "data:image/png;base64,iVBORw0KGgo=";
      expect((await patch({ logoUrl: logo })).body.logoUrl).toBe(logo);
      expect((await patch({ logoUrl: null })).body.logoUrl).toBeNull();
    });

    it("400 for a non-image value", async () => {
      await createTailor();
      const res = await patch({ logoUrl: "https://evil.example/logo.png" });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Logo must be an image");
    });

    it("413 for a logo over the size limit", async () => {
      await createTailor();
      const res = await patch({ logoUrl: "data:image/png;base64," + "A".repeat(400_001) });
      expect(res.status).toBe(413);
    });
  });

  describe("bankAccounts", () => {
    it("filters invalid entries and makes the first account the default when none is set", async () => {
      await createTailor();
      const res = await patch({
        bankAccounts: [
          null,
          "string",
          { bankName: "", accountNumber: "1" },
          { bankName: "GTBank", accountNumber: "" },
          { bankName: "  GTBank ", accountName: " Ada ", accountNumber: " 0123 " },
          { bankName: "Zenith", accountNumber: "999" },
        ],
      });
      expect(res.status).toBe(200);
      const accounts = res.body.bankAccounts;
      expect(accounts).toHaveLength(2);
      expect(accounts[0]).toMatchObject({ bankName: "GTBank", accountName: "Ada", accountNumber: "0123", isDefault: true });
      expect(accounts[1]).toMatchObject({ bankName: "Zenith", accountName: "", isDefault: false });
      expect(typeof accounts[1].id).toBe("string");
    });

    it("keeps exactly one default (the first marked)", async () => {
      await createTailor();
      const res = await patch({
        bankAccounts: [
          { bankName: "A", accountNumber: "1" },
          { bankName: "B", accountNumber: "2", isDefault: true },
          { bankName: "C", accountNumber: "3", isDefault: true },
        ],
      });
      expect(res.body.bankAccounts.map((a: { isDefault: boolean }) => a.isDefault)).toEqual([false, true, false]);
    });

    it("keeps given ids and caps the list at 10", async () => {
      await createTailor();
      const input = Array.from({ length: 12 }, (_, i) => ({ id: `acc-${i}`, bankName: `Bank ${i}`, accountNumber: `${i}` }));
      const res = await patch({ bankAccounts: input });
      expect(res.body.bankAccounts).toHaveLength(10);
      expect(res.body.bankAccounts[0].id).toBe("acc-0");
    });

    it("truncates long fields", async () => {
      await createTailor();
      const res = await patch({ bankAccounts: [{ bankName: "b".repeat(200), accountName: "n".repeat(200), accountNumber: "9".repeat(200) }] });
      const [a] = res.body.bankAccounts;
      expect(a.bankName).toHaveLength(80);
      expect(a.accountName).toHaveLength(120);
      expect(a.accountNumber).toHaveLength(40);
    });

    it("an empty list clears accounts", async () => {
      await createTailor();
      await patch({ bankAccounts: [{ bankName: "A", accountNumber: "1" }] });
      expect((await patch({ bankAccounts: [] })).body.bankAccounts).toEqual([]);
    });
  });
});
