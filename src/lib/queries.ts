"use client";

// Named, cached data hooks for every screen. Keys line up with the
// invalidations in src/lib/data/store.ts.

import { customerRepo, measurementRepo, orderRepo, templateRepo } from "@/lib/data/store";
import { prefetchQuery, useQuery } from "@/lib/query";

export const qk = {
  customers: "customers",
  customer: (id: string) => `customer:${id}`,
  measurements: (customerId: string) => `measurements:${customerId}`,
  measurementSet: (id: string) => `measurementSet:${id}`,
  templates: "templates",
  orders: "orders",
  ordersByCustomer: (customerId: string) => `orders:customer:${customerId}`,
  order: (id: string) => `order:${id}`,
};

export const useCustomers = () => useQuery(qk.customers, customerRepo.list);
export const useOrders = () => useQuery(qk.orders, orderRepo.list);
/** Templates are global and rarely change — keep them for 10 minutes. */
export const useTemplates = () => useQuery(qk.templates, templateRepo.list, { staleMs: 600_000 });

export const useCustomer = (id: string | null) => useQuery(id ? qk.customer(id) : null, () => customerRepo.getById(id!));
export const useMeasurements = (customerId: string | null) =>
  useQuery(customerId ? qk.measurements(customerId) : null, () => measurementRepo.listByCustomer(customerId!));
export const useOrdersByCustomer = (customerId: string | null) =>
  useQuery(customerId ? qk.ordersByCustomer(customerId) : null, () => orderRepo.getByCustomer(customerId!));
export const useOrder = (id: string | null) => useQuery(id ? qk.order(id) : null, () => orderRepo.getById(id!));
export const useMeasurementSet = (id: string | null) =>
  useQuery(id ? qk.measurementSet(id) : null, () => measurementRepo.getById(id!), { staleMs: 600_000 });

// ---- prefetch on intent (hover / touch) so detail screens open instantly ----

export function prefetchOrder(id: string) {
  prefetchQuery(qk.order(id), () => orderRepo.getById(id));
}

export function prefetchClient(id: string) {
  prefetchQuery(qk.customer(id), () => customerRepo.getById(id));
  prefetchQuery(qk.measurements(id), () => measurementRepo.listByCustomer(id));
  prefetchQuery(qk.ordersByCustomer(id), () => orderRepo.getByCustomer(id));
  prefetchQuery(qk.templates, templateRepo.list, 600_000);
}

/** Start the data most screens need as soon as the app opens. */
export function prefetchWorkspace() {
  prefetchQuery(qk.orders, orderRepo.list);
  prefetchQuery(qk.customers, customerRepo.list);
  prefetchQuery(qk.templates, templateRepo.list, 600_000);
}
