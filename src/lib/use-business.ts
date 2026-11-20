"use client";

// Shared, cached access to the signed-in business so every screen can
// read currency / unit system without each one re-fetching /api/business.

import type { Business } from "@/types";
import { businessRepo, meRepo, type Me } from "./data/store";
import { clearQueries, setQueryData, useQuery } from "./query";

const KEY = "business";

/** Call after updating the business so all mounted screens refresh. */
export function setCachedBusiness(b: Business | null) {
  setQueryData<Business | null>(KEY, b);
}

/** Forget all cached data (sign-out / account deletion). */
export function clearBusinessCache() {
  clearQueries();
}

export function useBusiness() {
  const q = useQuery<Business | null>(KEY, businessRepo.get, { staleMs: 60_000 });
  const business = q.data ?? null;
  return {
    business,
    loading: q.status === "loading",
    error: q.error,
    status: q.status,
    currency: business?.currency || "NGN",
    unit: business?.unitSystem === "metric" ? ("metric" as const) : ("imperial" as const),
    refresh: q.refetch,
  };
}

/** The signed-in account and its role. A 401 surfaces as `error` (signed out). */
export function useMe() {
  const q = useQuery<Me | null>("me", meRepo.get, { staleMs: 300_000 });
  return { me: q.data ?? null, role: q.data?.role, status: q.status, error: q.error, refetch: q.refetch };
}
