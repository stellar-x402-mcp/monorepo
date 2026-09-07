export interface ReplayStorageAdapter {
  get(key: string): Promise<{ timestamp: number; expiresAt: number } | null>;
  set(key: string, value: { timestamp: number; expiresAt: number }): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  prune(): Promise<number>;
}

export class MemoryReplayStorageAdapter implements ReplayStorageAdapter {
  private store = new Map<string, { timestamp: number; expiresAt: number }>();
  private maxEntries: number;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async set(key: string, value: { timestamp: number; expiresAt: number }) {
    if (this.store.size >= this.maxEntries) {
      await this.prune();
      if (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey) this.store.delete(oldestKey);
      }
    }
    this.store.set(key, value);
  }

  async has(key: string) {
    const entry = await this.get(key);
    return entry !== null;
  }

  async delete(key: string) {
    return this.store.delete(key);
  }

  async clear() {
    this.store.clear();
  }

  async size() {
    return this.store.size;
  }

  async prune() {
    const now = Date.now();
    let prunedCount = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        prunedCount++;
      }
    }
    return prunedCount;
  }
}

export interface ReplayProtectorConfig {
  defaultTtlSeconds?: number;
  adapter?: ReplayStorageAdapter;
  maxEntries?: number;
}

export class ReplayProtector {
  private adapter: ReplayStorageAdapter;
  private defaultTtlSeconds: number;

  constructor(config?: ReplayProtectorConfig) {
    this.defaultTtlSeconds = config?.defaultTtlSeconds || 86400; // 24 hours default
    this.adapter = config?.adapter || new MemoryReplayStorageAdapter(config?.maxEntries || 10000);
  }

  /**
   * Attempts to claim a transaction hash or payment token.
   * Returns success: true if claimed, or success: false if already seen (replay detected).
   */
  async claim(
    txHash: string,
    ttlSeconds?: number
  ): Promise<{ success: boolean; error?: string }> {
    const normalizedKey = txHash.trim().toLowerCase();
    if (!normalizedKey) {
      return { success: false, error: 'Empty transaction hash provided' };
    }

    const existing = await this.adapter.get(normalizedKey);
    if (existing) {
      return {
        success: false,
        error: `Payment transaction hash ${txHash} has already been claimed (replay detected)`,
      };
    }

    const ttl = (ttlSeconds ?? this.defaultTtlSeconds) * 1000;
    const now = Date.now();
    await this.adapter.set(normalizedKey, {
      timestamp: now,
      expiresAt: now + ttl,
    });

    return { success: true };
  }

  async has(txHash: string): Promise<boolean> {
    return this.adapter.has(txHash.trim().toLowerCase());
  }

  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  async prune(): Promise<number> {
    return this.adapter.prune();
  }

  async size(): Promise<number> {
    return this.adapter.size();
  }
}
