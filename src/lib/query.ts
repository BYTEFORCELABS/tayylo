"use client";

// Tiny stale-while-revalidate cache for API data.
//
// - A screen you've already visited renders instantly from memory, then
//   refreshes quietly in the background.
// - Identical requests in flight are shared (no duplicate network calls).
// - Mutations in src/lib/data/store.ts invalidate the affected keys, so
//   every mounted screen updates itself after a change.

import React from "react";

type Status = "loading" | "ready" | "error";

interface Snapshot<T> {
  data: T | undefined;
  status: Status;
  error: unknown;
  /** True while a background refresh is running over existing data. */
  refreshing: boolean;
}

interface Entry<T> {
  snapshot: Snapshot<T>;
  updatedAt: number;
  promise?: Promise<T>;
  fetcher?: () => Promise<T>;
  listeners: Set<() => void>;
}

const cache = new Map<string, Entry<unknown>>();
const EMPTY: Snapshot<never> = { data: undefined, status: "loading", error: undefined, refreshing: false };

function getEntry<T>(key: string): Entry<T> {
  let e = cache.get(key) as Entry<T> | undefined;
  if (!e) {
    e = { snapshot: EMPTY, updatedAt: 0, listeners: new Set() };
    cache.set(key, e as Entry<unknown>);
  }
  return e;
}

function emit<T>(e: Entry<T>, patch: Partial<Snapshot<T>>) {
  e.snapshot = { ...e.snapshot, ...patch };
  e.listeners.forEach(l => l());
}

/** Fetch (or join an in-flight fetch) and store the result. */
export function fetchQuery<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const e = getEntry<T>(key);
  e.fetcher = fetcher;
  if (e.promise) return e.promise;
  if (e.snapshot.data !== undefined) emit(e, { refreshing: true });
  else if (e.snapshot.status !== "loading") emit(e, { status: "loading", error: undefined });
  const p = fetcher()
    .then(data => {
      e.updatedAt = Date.now();
      emit(e, { data, status: "ready", error: undefined, refreshing: false });
      return data;
    })
    .catch(err => {
      // Keep showing old data if we have it; only surface the error otherwise.
      emit(e, e.snapshot.data !== undefined ? { refreshing: false } : { status: "error", error: err, refreshing: false });
      throw err;
    })
    .finally(() => {
      e.promise = undefined;
    });
  e.promise = p;
  return p;
}

/** Warm the cache ahead of navigation (e.g. on hover / touch). */
export function prefetchQuery<T>(key: string, fetcher: () => Promise<T>, staleMs = 30_000) {
  const e = getEntry<T>(key);
  if (e.promise || Date.now() - e.updatedAt < staleMs) return;
  fetchQuery(key, fetcher).catch(() => {});
}

/** Read cached data without subscribing. */
export function getQueryData<T>(key: string): T | undefined {
  return (cache.get(key) as Entry<T> | undefined)?.snapshot.data;
}

/** Write data directly (optimistic updates, or results returned by a mutation). */
export function setQueryData<T>(key: string, updater: T | ((old: T | undefined) => T)) {
  const e = getEntry<T>(key);
  const next = typeof updater === "function" ? (updater as (o: T | undefined) => T)(e.snapshot.data) : updater;
  e.updatedAt = Date.now();
  emit(e, { data: next, status: "ready", error: undefined });
}

/**
 * Mark every key starting with one of the prefixes as stale. Keys that a
 * mounted screen is using refetch right away; the rest refetch on next use.
 */
export function invalidateQueries(...prefixes: string[]) {
  cache.forEach((e, key) => {
    if (!prefixes.some(p => key === p || key.startsWith(p + ":"))) return;
    e.updatedAt = 0;
    if (e.listeners.size > 0 && e.fetcher) fetchQuery(key, e.fetcher).catch(() => {});
  });
}

/** Forget everything (sign-out, workspace reset). */
export function clearQueries() {
  cache.clear();
}

interface UseQueryOptions {
  /** Data younger than this is used without refetching. */
  staleMs?: number;
}

/**
 * Subscribe to a cached query. Pass `null` as key to skip (e.g. until an id
 * is known). Returns cached data immediately when available.
 */
export function useQuery<T>(key: string | null, fetcher: () => Promise<T>, { staleMs = 10_000 }: UseQueryOptions = {}) {
  const fetcherRef = React.useRef(fetcher);
  React.useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const subscribe = React.useCallback(
    (onChange: () => void) => {
      if (!key) return () => {};
      const e = getEntry<T>(key);
      e.listeners.add(onChange);
      return () => {
        e.listeners.delete(onChange);
      };
    },
    [key]
  );
  const getSnapshot = React.useCallback(() => (key ? getEntry<T>(key).snapshot : (EMPTY as Snapshot<T>)), [key]);
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY as Snapshot<T>);

  React.useEffect(() => {
    if (!key) return;
    const e = getEntry<T>(key);
    if (e.promise) return;
    if (e.snapshot.data === undefined || Date.now() - e.updatedAt > staleMs) {
      fetchQuery(key, () => fetcherRef.current()).catch(() => {});
    }
  }, [key, staleMs]);

  const refetch = React.useCallback(() => {
    if (!key) return Promise.resolve(undefined);
    const e = getEntry<T>(key);
    if (e.snapshot.data === undefined) emit(e, { status: "loading" });
    return fetchQuery(key, () => fetcherRef.current()).catch(() => undefined);
  }, [key]);

  const mutate = React.useCallback(
    (updater: T | ((old: T | undefined) => T)) => {
      if (key) setQueryData(key, updater);
    },
    [key]
  );

  return { ...snapshot, refetch, mutate };
}
