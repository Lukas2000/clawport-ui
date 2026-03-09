/**
 * In-process server-side cache for expensive API operations.
 * Module-level Map persists across requests for the lifetime of the server process.
 * TTL is per-entry so callers can use different expiry windows.
 */

interface CacheEntry<T> {
  data: T
  ts: number
  ttl: number
}

const store = new Map<string, CacheEntry<unknown>>()

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const now = Date.now()
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (entry && now - entry.ts < entry.ttl) {
    return entry.data
  }
  const data = await fetcher()
  store.set(key, { data, ts: now, ttl: ttlMs })
  return data
}

export function invalidate(key: string): void {
  store.delete(key)
}

export function invalidateAll(): void {
  store.clear()
}
