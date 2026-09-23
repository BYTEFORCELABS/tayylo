// ============================================================
// Tayylo — Mock Data Store (localStorage persisted)
// ============================================================
"use client";

import type {
  Business,
  Customer,
  MeasurementSet,
  MeasurementTemplate,
  Order,
  ScheduleItem,
  Payment,
  Fitting,
  Media,
} from "@/types";
import {
  seedBusiness,
  seedCustomers,
  seedMeasurementSets,
  seedTemplates,
  seedOrders,
  seedSchedule,
  getGarmentImage,
} from "./seed-data";
import { v4 as uuid } from "uuid";

const STORAGE_KEY = "tayylo_store";

interface StoreData {
  business: Business;
  customers: Customer[];
  measurementSets: MeasurementSet[];
  templates: MeasurementTemplate[];
  orders: Order[];
  schedule: ScheduleItem[];
  isOnboarded: boolean;
}

function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoreData>;
      const rawCustomers = parsed.customers ?? seedCustomers;
      const customers = rawCustomers.map((c, i) => {
        const seed = seedCustomers.find(sc => sc.id === c.id) || seedCustomers[i % seedCustomers.length];
        return {
          ...c,
          photoUrl: c.photoUrl || seed?.photoUrl,
          media: c.media && c.media.length > 0 ? c.media : (seed?.media || []),
        };
      });

      const rawOrders = parsed.orders ?? seedOrders;
      const orders = rawOrders.map(o => ({
        ...o,
        items: o.items.map(it => ({
          ...it,
          imageUrl: it.imageUrl || getGarmentImage(it.garmentType),
        })),
      }));

      return {
        business: parsed.business ?? seedBusiness,
        customers,
        measurementSets: parsed.measurementSets ?? seedMeasurementSets,
        templates: parsed.templates && parsed.templates.length >= 10 ? parsed.templates : seedTemplates,
        orders,
        schedule: parsed.schedule ?? seedSchedule,
        isOnboarded: parsed.isOnboarded ?? false,
      };
    }
  } catch { /* ignore */ }
  return getDefaultData();
}

function getDefaultData(): StoreData {
  return {
    business: seedBusiness,
    customers: seedCustomers,
    measurementSets: seedMeasurementSets,
    templates: seedTemplates,
    orders: seedOrders,
    schedule: seedSchedule,
    isOnboarded: false,
  };
}

function saveStore(data: StoreData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full or blocked */ }
}

// Simulate async delay
function delay(ms?: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms ?? (80 + Math.random() * 120)));
}

let _store: StoreData | null = null;
function getStore(): StoreData {
  if (!_store) _store = loadStore();
  return _store;
}
function persist() {
  if (_store) saveStore(_store);
}

// ---- Repositories ----

export const businessRepo = {
  async get() {
    await delay(50);
    return getStore().business;
  },
  async update(partial: Partial<Business>) {
    await delay(50);
    Object.assign(getStore().business, partial);
    persist();
    return getStore().business;
  },
  async isOnboarded() {
    return getStore().isOnboarded;
  },
  async setOnboarded(v: boolean) {
    getStore().isOnboarded = v;
    persist();
  },
};

export const customerRepo = {
  async list() {
    await delay(60);
    return [...getStore().customers].sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
  async search(query: string) {
    await delay(40);
    const q = query.toLowerCase().trim();
    if (!q) return getStore().customers.slice(0, 10);
    return getStore().customers.filter(
      c =>
        c.fullName.toLowerCase().includes(q) ||
        c.phones.some(p => p.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    );
  },
  async getById(id: string) {
    await delay(40);
    return getStore().customers.find(c => c.id === id) ?? null;
  },
  async create(data: Omit<Customer, "id" | "businessId" | "createdAt" | "updatedAt">) {
    await delay(80);
    const customer: Customer = {
      ...data,
      id: `cust-${uuid().slice(0, 8)}`,
      businessId: getStore().business.id,
      media: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getStore().customers.push(customer);
    persist();
    return customer;
  },
  async update(id: string, partial: Partial<Customer>) {
    await delay(60);
    const cust = getStore().customers.find(c => c.id === id);
    if (cust) {
      Object.assign(cust, partial, { updatedAt: new Date().toISOString() });
      persist();
    }
    return cust ?? null;
  },
  async checkDuplicatePhone(phone: string, excludeId?: string) {
    const normalized = phone.replace(/\s/g, "");
    return getStore().customers.some(
      c => c.id !== excludeId && c.phones.some(p => p.replace(/\s/g, "") === normalized)
    );
  },
  async addMedia(customerId: string, mediaItem: { url: string; caption?: string }) {
    await delay(60);
    const cust = getStore().customers.find(c => c.id === customerId);
    if (!cust) return null;
    if (!cust.media) cust.media = [];
    const newMedia: Media = {
      id: `med-${uuid().slice(0, 8)}`,
      ownerType: "customer",
      ownerId: customerId,
      url: mediaItem.url,
      caption: mediaItem.caption,
      createdAt: new Date().toISOString(),
    };
    cust.media.unshift(newMedia);
    cust.updatedAt = new Date().toISOString();
    persist();
    return newMedia;
  },
  async deleteMedia(customerId: string, mediaId: string) {
    await delay(40);
    const cust = getStore().customers.find(c => c.id === customerId);
    if (!cust || !cust.media) return false;
    cust.media = cust.media.filter(m => m.id !== mediaId);
    persist();
    return true;
  },
  async importCustomers(items: Array<{ fullName: string; phone?: string; email?: string; notes?: string }>) {
    await delay(120);
    let count = 0;
    const store = getStore();
    for (const item of items) {
      if (!item.fullName?.trim()) continue;
      const customer: Customer = {
        id: `cust-${uuid().slice(0, 8)}`,
        businessId: store.business.id,
        fullName: item.fullName.trim(),
        phones: item.phone ? [item.phone.trim()] : [],
        email: item.email?.trim() || undefined,
        notes: item.notes?.trim() || undefined,
        tags: ["Imported"],
        media: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.customers.push(customer);
      count++;
    }
    persist();
    return count;
  },
};

export const measurementRepo = {
  async listByCustomer(customerId: string) {
    await delay(60);
    return getStore().measurementSets
      .filter(s => s.customerId === customerId)
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
  },
  async getById(id: string) {
    await delay(40);
    return getStore().measurementSets.find(s => s.id === id) ?? null;
  },
  async getLatest(customerId: string, templateId?: string) {
    await delay(40);
    const sets = getStore().measurementSets
      .filter(s => s.customerId === customerId && (!templateId || s.templateId === templateId))
      .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
    return sets[0] ?? null;
  },
  async createVersion(data: Omit<MeasurementSet, "id" | "businessId" | "takenAt" | "status">) {
    await delay(80);
    const set: MeasurementSet = {
      ...data,
      id: `ms-${uuid().slice(0, 8)}`,
      businessId: getStore().business.id,
      takenAt: new Date().toISOString(),
      status: "final",
    };
    getStore().measurementSets.push(set);
    persist();
    return set;
  },
  async restoreVersion(versionId: string, customNote?: string) {
    await delay(80);
    const existing = getStore().measurementSets.find(s => s.id === versionId);
    if (!existing) return null;
    const restored: MeasurementSet = {
      id: `ms-${uuid().slice(0, 8)}`,
      businessId: getStore().business.id,
      customerId: existing.customerId,
      templateId: existing.templateId,
      templateName: existing.templateName,
      takenAt: new Date().toISOString(),
      source: "restored",
      supersedesId: existing.id,
      status: "final",
      note: customNote || `Restored from version of ${new Date(existing.takenAt).toLocaleDateString("en-GB")}`,
      values: [...existing.values],
    };
    getStore().measurementSets.push(restored);
    persist();
    return restored;
  },
};

export const templateRepo = {
  async list() {
    await delay(50);
    return getStore().templates;
  },
  async getById(id: string) {
    await delay(30);
    return getStore().templates.find(t => t.id === id) ?? null;
  },
  async duplicate(templateId: string, newName?: string) {
    await delay(80);
    const orig = getStore().templates.find(t => t.id === templateId);
    if (!orig) return null;
    const newId = `tpl-${uuid().slice(0, 8)}`;
    const copy: MeasurementTemplate = {
      ...orig,
      id: newId,
      name: newName || `${orig.name} (Copy)`,
      businessId: getStore().business.id,
      version: 1,
      fields: orig.fields.map(f => ({ ...f, id: uuid(), templateId: newId })),
    };
    getStore().templates.push(copy);
    persist();
    return copy;
  },
};

export const orderRepo = {
  async list() {
    await delay(60);
    return [...getStore().orders].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  },
  async getById(id: string) {
    await delay(50);
    return getStore().orders.find(o => o.id === id) ?? null;
  },
  async getByCustomer(customerId: string) {
    await delay(50);
    return getStore().orders.filter(o => o.customerId === customerId);
  },
  async create(data: Omit<Order, "id" | "businessId" | "createdAt" | "updatedAt">) {
    await delay(80);
    const order: Order = {
      ...data,
      id: `ord-${uuid().slice(0, 8)}`,
      businessId: getStore().business.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    getStore().orders.push(order);
    persist();
    return order;
  },
  async updateStatus(id: string, status: Order["statusName"]) {
    await delay(60);
    const order = getStore().orders.find(o => o.id === id);
    if (order) {
      order.statusName = status;
      order.updatedAt = new Date().toISOString();
      persist();
    }
    return order ?? null;
  },
  async addPayment(orderId: string, payment: { amountMinor: number; method: string; reference?: string; paidAt?: string }) {
    await delay(80);
    const order = getStore().orders.find(o => o.id === orderId);
    if (!order) return null;
    const newPayment: Payment = {
      id: `pay-${uuid().slice(0, 8)}`,
      orderId,
      amountMinor: payment.amountMinor,
      method: payment.method,
      reference: payment.reference,
      paidAt: payment.paidAt || new Date().toISOString(),
    };
    order.payments.push(newPayment);
    order.updatedAt = new Date().toISOString();
    persist();
    return newPayment;
  },
  async addFitting(orderId: string, fitting: { outcome: "adjustments_needed" | "approved"; adjustments: Fitting["adjustments"]; notes?: string; fittedAt?: string }) {
    await delay(80);
    const order = getStore().orders.find(o => o.id === orderId);
    if (!order) return null;
    const nextNumber = order.fittings.length + 1;
    const newFitting: Fitting = {
      id: `fit-${uuid().slice(0, 8)}`,
      orderId,
      number: nextNumber,
      fittedAt: fitting.fittedAt || new Date().toISOString(),
      outcome: fitting.outcome,
      adjustments: fitting.adjustments,
      notes: fitting.notes,
    };
    order.fittings.push(newFitting);
    order.updatedAt = new Date().toISOString();
    persist();
    return newFitting;
  },
};

export const scheduleRepo = {
  async list() {
    await delay(40);
    return [...getStore().schedule];
  },
  async toggleComplete(id: string) {
    await delay(40);
    const item = getStore().schedule.find(s => s.id === id);
    if (item) {
      item.completed = !item.completed;
      persist();
      return item.completed;
    }
    return false;
  },
  async add(item: Omit<ScheduleItem, "id">) {
    await delay(60);
    const newItem: ScheduleItem = {
      ...item,
      id: `sch-${uuid().slice(0, 8)}`,
    };
    getStore().schedule.push(newItem);
    persist();
    return newItem;
  },
};

// Export store data
export function exportData() {
  const store = getStore();
  const jsonStr = JSON.stringify(store, null, 2);

  // Generate CSV for clients
  const headers = ["Full Name", "Phone", "Email", "Tags", "Notes", "Created At"];
  const rows = store.customers.map(c => [
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

// Reset all data
export function resetStore() {
  _store = getDefaultData();
  persist();
}
