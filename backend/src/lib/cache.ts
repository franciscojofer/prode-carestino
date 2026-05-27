// File: backend/src/lib/cache.ts
// Purpose: Tiny in-memory, per-process cache for hot read endpoints.
// Functionality: Stores one value per string key with a TTL. Exposes a
// `cached()` helper that returns the memoized value if fresh, otherwise
// runs the loader, stores the result and returns it. A single in-flight
// loader is shared across concurrent callers ("stampede" protection) so
// 150 simultaneous requests on a cold cache only run the query once.
// Role: Used by the tournament services (standings, groups, rounds) to
// absorb traffic spikes after a match ends. Manual invalidation hooks let
// the admin write paths drop the relevant keys after they change data.

type Entry<T> = {
  value: T;
  expiresAt: number;
};

// One inflight promise per key so concurrent loaders coalesce into a single
// underlying call (stampede protection).
const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

// Returns the cached value if still fresh, otherwise runs `loader`, stores
// its result and returns it. Concurrent callers on the same key share the
// same in-flight promise.
// Inputs: cache key, TTL in milliseconds, loader producing the value.
// Output: the cached or freshly-loaded value.
export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, promise);
  return promise;
}

// Drops a single cache entry. Called by admin write paths when the
// underlying data changes (e.g. a new match result invalidates standings).
export function invalidate(key: string): void {
  store.delete(key);
}

// Drops every cached entry. Used by tests and by `seed:dev` to avoid
// serving stale data after the fixture is rebuilt.
export function clearAll(): void {
  store.clear();
}
