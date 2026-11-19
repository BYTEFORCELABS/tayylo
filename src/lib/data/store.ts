// ============================================================
// Tayylo — data layer backed by our own Next.js API routes
//
// Same exported API as before (businessRepo, customerRepo, measurementRepo,
// templateRepo, orderRepo, exportData, resetStore) so no page needed to
// change — only what's inside each function changed, from a supabase-js
// call to a fetch() against src/app/api/**. Authorization (never let one
// business see another's data) is enforced server-side in those routes via
// src/lib/auth-helpers.ts, not here — this file just shapes requests and
// responses.
// ============================================================
"use client";

import type {
  Business,
  Customer,
  Media,
  MeasurementSet,
  MeasurementTemplate,
  Order,
  Payment,
  Fitting,
} from "@/types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 404) return null as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

// ---- business ----

export const businessRepo = {
  async get(): Promise<Business | null> {
    return api<Business | null>("/api/business");
  },
  async update(partial: Partial<Business>): Promise<Business> {
    return api<Business>("/api/business", { method: "PATCH", body: JSON.stringify(partial) });
  },
  async isOnboarded(): Promise<boolean> {
    return !!(await businessRepo.get());
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for API parity with callers
  async setOnboarded(_v: boolean): Promise<void> {
    // No-op — "onboarded" is derived from whether a business record exists.
  },
};

// ---- customers ----

export const customerRepo = {
  async list(): Promise<Customer[]> {
    return (await api<Customer[]>("/api/customers")) ?? [];
  },
  async search(query: string): Promise<Customer[]> {
    return (await api<Customer[]>(`/api/customers?q=${encodeURIComponent(query)}`)) ?? [];
  },
  async getById(id: string): Promise<Customer | null> {
    return api<Customer | null>(`/api/customers/${id}`);
  },
  async create(data: Omit<Customer, "id" | "businessId" | "createdAt" | "updatedAt">): Promise<Customer> {
    return api<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) });
  },
  async update(id: string, partial: Partial<Customer>): Promise<Customer | null> {
    return api<Customer | null>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(partial) });
  },
  async checkDuplicatePhone(phone: string, excludeId?: string): Promise<boolean> {
    const all = await customerRepo.list();
    const normalized = phone.replace(/\s/g, "");
    return all.some(
      c => c.id !== excludeId && c.phones.some(p => p.replace(/\s/g, "") === normalized)
    );
  },
  async addMedia(customerId: string, mediaItem: { url: string; caption?: string }): Promise<Media | null> {
    return api<Media | null>(`/api/customers/${customerId}/media`, {
      method: "POST",
      body: JSON.stringify(mediaItem),
    });
  },
  async deleteMedia(customerId: string, mediaId: string): Promise<boolean> {
    const result = await api<{ ok: boolean }>(`/api/customers/${customerId}/media/${mediaId}`, {
      method: "DELETE",
    });
    return result?.ok ?? false;
  },
  async importCustomers(items: Array<{ fullName: string; phone?: string; email?: string; notes?: string }>): Promise<number> {
    const result = await api<{ count: number }>("/api/customers/import", {
      method: "POST",
      body: JSON.stringify(items),
    });
    return result?.count ?? 0;
  },
};

// ---- measurement sets ----

export const measurementRepo = {
  async listByCustomer(customerId: string): Promise<MeasurementSet[]> {
    return (await api<MeasurementSet[]>(`/api/customers/${customerId}/measurements`)) ?? [];
  },
  async getById(id: string): Promise<MeasurementSet | null> {
    return api<MeasurementSet | null>(`/api/measurements/${id}`);
  },
  async getLatest(customerId: string, templateId?: string): Promise<MeasurementSet | null> {
    const q = templateId ? `?latest=true&templateId=${encodeURIComponent(templateId)}` : "?latest=true";
    return api<MeasurementSet | null>(`/api/customers/${customerId}/measurements${q}`);
  },
  async createVersion(data: Omit<MeasurementSet, "id" | "businessId" | "takenAt" | "status">): Promise<MeasurementSet> {
    return api<MeasurementSet>("/api/measurements", { method: "POST", body: JSON.stringify(data) });
  },
  async restoreVersion(versionId: string, customNote?: string): Promise<MeasurementSet | null> {
    return api<MeasurementSet | null>(`/api/measurements/${versionId}/restore`, {
      method: "POST",
      body: JSON.stringify({ note: customNote }),
    });
  },
};

// ---- measurement templates ----

export const templateRepo = {
  async list(): Promise<MeasurementTemplate[]> {
    return (await api<MeasurementTemplate[]>("/api/templates")) ?? [];
  },
};

// ---- orders ----

export const orderRepo = {
  async list(): Promise<Order[]> {
    return (await api<Order[]>("/api/orders")) ?? [];
  },
  async getById(id: string): Promise<Order | null> {
    return api<Order | null>(`/api/orders/${id}`);
  },
  async getByCustomer(customerId: string): Promise<Order[]> {
    const all = await orderRepo.list();
    return all.filter(o => o.customerId === customerId);
  },
  async create(data: Omit<Order, "id" | "businessId" | "createdAt" | "updatedAt">): Promise<Order> {
    return api<Order>("/api/orders", { method: "POST", body: JSON.stringify(data) });
  },
  async updateStatus(id: string, status: Order["statusName"]): Promise<Order | null> {
    return api<Order | null>(`/api/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ statusName: status }),
    });
  },
  async addPayment(
    orderId: string,
    payment: { amountMinor: number; method: string; reference?: string; paidAt?: string }
  ): Promise<Payment | null> {
    return api<Payment | null>(`/api/orders/${orderId}/payments`, {
      method: "POST",
      body: JSON.stringify(payment),
    });
  },
  async addFitting(
    orderId: string,
    fitting: { outcome: "adjustments_needed" | "approved"; adjustments: Fitting["adjustments"]; notes?: string; fittedAt?: string }
  ): Promise<Fitting | null> {
    return api<Fitting | null>(`/api/orders/${orderId}/fittings`, {
      method: "POST",
      body: JSON.stringify(fitting),
    });
  },
};

// ---- export / reset ----

export async function exportData(): Promise<{ jsonStr: string; csvStr: string }> {
  const [business, customers, orders] = await Promise.all([
    businessRepo.get(),
    customerRepo.list(),
    orderRepo.list(),
  ]);

  const measurementSets = (
    await Promise.all(customers.map(c => measurementRepo.listByCustomer(c.id)))
  ).flat();

  const snapshot = { business, customers, measurementSets, orders };
  const jsonStr = JSON.stringify(snapshot, null, 2);

  const headers = ["Full Name", "Phone", "Email", "Tags", "Notes", "Created At"];
  const rows = customers.map(c => [
    `"${c.fullName.replace(/"/g, '""')}"`,
    `"${c.phones.join(", ")}"`,
    `"${c.email || ""}"`,
    `"${c.tags.join(", ")}"`,
    `"${(c.notes || "").replace(/"/g, '""')}"`,
    `"${c.createdAt}"`,
  ]);
  const csvStr = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  return { jsonStr, csvStr };
}

export async function resetStore(): Promise<void> {
  await api("/api/reset", { method: "POST" });
}
