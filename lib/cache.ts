// In-memory cache — replaces Redis for local dev simplicity.
// Redis was removed because it had no host port mapping and caused
// connection errors in local dev. For production scale, re-add Redis
// and swap the Map for ioredis calls.

interface CacheEntry {
  value: string;
  expiresAt: number | null;
}

const store = new Map<string, CacheEntry>();

function isExpired(entry: CacheEntry): boolean {
  return entry.expiresAt !== null && Date.now() > entry.expiresAt;
}

// Mimics the ioredis subset used in this codebase
const memoryCache = {
  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry || isExpired(entry)) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  async set(key: string, value: string, exFlag?: 'EX', ttlSeconds?: number): Promise<'OK'> {
    const expiresAt = exFlag === 'EX' && ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    store.set(key, { value, expiresAt });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (store.delete(key)) count++;
    }
    return count;
  },

  async ping(): Promise<'PONG'> {
    return 'PONG';
  },

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return [...store.keys()].filter(k => regex.test(k));
  },

  on(_event: string, _cb: (...args: unknown[]) => void): void {
    // no-op — compatibility shim for ioredis .on('error') / .on('connect')
  },
};

export type MemoryCache = typeof memoryCache;

let instance: MemoryCache | null = null;

export function getRedis(): MemoryCache {
  if (!instance) {
    instance = memoryCache;
    console.log('Cache: using in-memory store (Redis removed)');
  }
  return instance;
}

export default getRedis;
