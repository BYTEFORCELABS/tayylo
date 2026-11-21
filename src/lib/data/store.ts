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
import { clearQueries, fetchQuery, getQueryData, invalidateQueries } from "@/lib/query";

/** Error carrying the HTTP status, so callers can tell "signed out" (401) apart. */
export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (res.status === 404) return null as T;
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(res.status, body.error || `Request to ${path} failed (${res.status})`);
  }
  return res.json();
}

/** Run a write, then mark the affected cached queries stale. */
async function mutating<T>(run: Promise<T>, ...keys: string[]): Promise<T> {
  const result = await run;
  invalidateQueries(...keys);
  return result;
}

// ---- business ----

export const businessRepo = {
  async get(): Promise<Business | null> {
    return api<Business | null>("/api/business");
  },
  async update(partial: Partial<Business>): Promise<Business> {
    return mutating(api<Business>("/api/business", { method: "PATCH", body: JSON.stringify(partial) }), "business");
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
    return mutating(api<Customer>("/api/customers", { method: "POST", body: JSON.stringify(data) }), "customers");
  },
  async update(id: string, partial: Partial<Customer>): Promise<Customer | null> {
    return mutating(
      api<Customer | null>(`/api/customers/${id}`, { method: "PATCH", body: JSON.stringify(partial) }),
      "customers",
      `customer:${id}`
    );
  },
  async checkDuplicatePhone(phone: string, excludeId?: string): Promise<boolean> {
    // Reuse the cached client list when it's there — no extra request per keystroke.
    const all = getQueryData<Customer[]>("customers") ?? (await fetchQuery("customers", customerRepo.list));
    const normalized = phone.replace(/\s/g, "");
    return all.some(
      c => c.id !== excludeId && c.phones.some(p => p.replace(/\s/g, "") === normalized)
    );
  },
  async addMedia(customerId: string, mediaItem: { url: string; caption?: string }): Promise<Media | null> {
    return mutating(
      api<Media | null>(`/api/customers/${customerId}/media`, {
        method: "POST",
        body: JSON.stringify(mediaItem),
      }),
      `customer:${customerId}`
    );
  },
  async deleteMedia(customerId: string, mediaId: string): Promise<boolean> {
    const result = await mutating(
      api<{ ok: boolean }>(`/api/customers/${customerId}/media/${mediaId}`, { method: "DELETE" }),
      `customer:${customerId}`
    );
    return result?.ok ?? false;
  },
  async importCustomers(items: Array<{ fullName: string; phone?: string; email?: string; notes?: string }>): Promise<number> {
    const result = await mutating(
      api<{ count: number }>("/api/customers/import", { method: "POST", body: JSON.stringify(items) }),
      "customers"
    );
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
    return mutating(
      api<MeasurementSet>("/api/measurements", { method: "POST", body: JSON.stringify(data) }),
      `measurements:${data.customerId}`,
      "customers"
    );
  },
  async restoreVersion(versionId: string, customNote?: string): Promise<MeasurementSet | null> {
    return mutating(
      api<MeasurementSet | null>(`/api/measurements/${versionId}/restore`, {
        method: "POST",
        body: JSON.stringify({ note: customNote }),
      }),
      "measurements",
      "customers"
    );
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
    return (await api<Order[]>(`/api/orders?customerId=${encodeURIComponent(customerId)}`)) ?? [];
  },
  async create(data: Omit<Order, "id" | "businessId" | "createdAt" | "updatedAt">): Promise<Order> {
    return mutating(api<Order>("/api/orders", { method: "POST", body: JSON.stringify(data) }), "orders");
  },
  async updateStatus(id: string, status: Order["statusName"]): Promise<Order | null> {
    return mutating(
      api<Order | null>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ statusName: status }) }),
      "orders",
      `order:${id}`
    );
  },
  async updatePrice(id: string, priceMinor: number): Promise<Order | null> {
    return mutating(
      api<Order | null>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ priceMinor }) }),
      "orders",
      `order:${id}`
    );
  },
  async delete(id: string): Promise<boolean> {
    const result = await mutating(api<{ ok: boolean }>(`/api/orders/${id}`, { method: "DELETE" }), "orders", `order:${id}`);
    return result?.ok ?? false;
  },
  /** Picks which bank account this order's invoice shows (null = the default). */
  async setBankAccount(id: string, bankAccountId: string | null): Promise<Order | null> {
    return mutating(
      api<Order | null>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ bankAccountId }) }),
      "orders",
      `order:${id}`
    );
  },
  async addPayment(
    orderId: string,
    payment: { amountMinor: number; method: string; reference?: string; paidAt?: string }
  ): Promise<Payment | null> {
    return mutating(
      api<Payment | null>(`/api/orders/${orderId}/payments`, { method: "POST", body: JSON.stringify(payment) }),
      "orders",
      `order:${orderId}`
    );
  },
  async addMedia(orderId: string, item: { url: string; caption?: string }): Promise<Media | null> {
    return mutating(
      api<Media | null>(`/api/orders/${orderId}/media`, { method: "POST", body: JSON.stringify(item) }),
      `order:${orderId}`
    );
  },
  async deleteMedia(orderId: string, mediaId: string): Promise<boolean> {
    const result = await mutating(
      api<{ ok: boolean }>(`/api/orders/${orderId}/media/${mediaId}`, { method: "DELETE" }),
      `order:${orderId}`
    );
    return result?.ok ?? false;
  },
  /** Chooses which photo represents the order in lists (null clears it). */
  async setCover(orderId: string, cover: { mediaId: string; thumbUrl: string } | null): Promise<Order | null> {
    return mutating(
      api<Order | null>(`/api/orders/${orderId}`, { method: "PATCH", body: JSON.stringify({ cover }) }),
      "orders",
      `order:${orderId}`
    );
  },
  /** Removes a fitting logged by mistake; later fittings are renumbered. */
  async deleteFitting(orderId: string, fittingId: string): Promise<boolean> {
    const result = await mutating(
      api<{ ok: boolean }>(`/api/orders/${orderId}/fittings/${fittingId}`, { method: "DELETE" }),
      "orders",
      `order:${orderId}`
    );
    return result?.ok ?? false;
  },
  async addFitting(
    orderId: string,
    fitting: { outcome: "adjustments_needed" | "approved"; adjustments: Fitting["adjustments"]; notes?: string; fittedAt?: string }
  ): Promise<Fitting | null> {
    return mutating(
      api<Fitting | null>(`/api/orders/${orderId}/fittings`, { method: "POST", body: JSON.stringify(fitting) }),
      "orders",
      `order:${orderId}`
    );
  },
};

// ---- export / reset ----

export async function exportData(): Promise<{ jsonStr: string; csvStr: string }> {
  const [business, customers, orders] = await Promise.all([
    businessRepo.get(),
    // The backup includes client photos, which lists normally leave out.
    api<Customer[]>("/api/customers?include=media").then(r => r ?? []),
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
  clearQueries();
}

// ---- account ----

export const accountRepo = {
  /** Permanently deletes the user and everything that cascades from it. */
  async delete(): Promise<void> {
    await api("/api/account", { method: "DELETE" });
    clearQueries();
  },
};

// ---- me / explore ----

import type { ExplorePage, ExplorePost } from "@/lib/explore";

export interface Me {
  id: string;
  email: string;
  role: "tailor" | "customer";
}

export const meRepo = {
  async get(): Promise<Me | null> {
    return api<Me | null>("/api/me");
  },
};

export const exploreRepo = {
  async list(params: { country?: string; category?: string; q?: string; cursor?: string }): Promise<ExplorePage> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    return (await api<ExplorePage>(`/api/explore?${qs}`)) ?? { posts: [], nextCursor: null, countries: [] };
  },
  async saved(): Promise<ExplorePost[]> {
    return (await api<ExplorePost[]>("/api/explore/saved")) ?? [];
  },
  /** Uploads a (pre-compressed) photo and returns its public URL. */
  async upload(blob: Blob): Promise<string> {
    const form = new FormData();
    form.set("file", new File([blob], "style.jpg", { type: "image/jpeg" }));
    const res = await fetch("/api/explore/upload", { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiRequestError(res.status, body.error || "Couldn't upload the photo");
    }
    return (await res.json()).url as string;
  },
  async create(data: {
    imageUrl: string;
    caption?: string;
    country: string;
    category: string;
    tags: string[];
    width?: number;
    height?: number;
  }): Promise<ExplorePost> {
    return mutating(api<ExplorePost>("/api/explore", { method: "POST", body: JSON.stringify(data) }), "explore");
  },
  async remove(id: string): Promise<void> {
    await mutating(api("/api/explore/" + id, { method: "DELETE" }), "explore");
  },
  async setSaved(id: string, saved: boolean): Promise<void> {
    await api(`/api/explore/${id}/save`, { method: saved ? "POST" : "DELETE" });
  },
};
