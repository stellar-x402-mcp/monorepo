import { describe, it, expect, vi } from 'vitest';
import { RedisReplayStorageAdapter, ReplayProtector } from '../src/replay.js';

describe('RedisReplayStorageAdapter', () => {
  it('should store and query keys using atomic Redis EX parameters', async () => {
    const memoryKv = new Map<string, string>();

    const mockRedisClient = {
      get: vi.fn().mockImplementation(async (key: string) => memoryKv.get(key) || null),
      set: vi.fn().mockImplementation(async (key: string, val: string) => {
        memoryKv.set(key, val);
        return 'OK';
      }),
      del: vi.fn().mockImplementation(async (key: string) => (memoryKv.delete(key) ? 1 : 0)),
      exists: vi.fn().mockImplementation(async (key: string) => (memoryKv.has(key) ? 1 : 0)),
      dbsize: vi.fn().mockImplementation(async () => memoryKv.size),
    };

    const adapter = new RedisReplayStorageAdapter({
      client: mockRedisClient,
      keyPrefix: 'test:replay:',
    });

    const protector = new ReplayProtector({ adapter });

    const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const claim1 = await protector.claim(txHash, 60);

    expect(claim1.success).toBe(true);
    expect(mockRedisClient.set).toHaveBeenCalledWith(
      `test:replay:${txHash}`,
      expect.any(String),
      'EX',
      60
    );

    const exists = await protector.has(txHash);
    expect(exists).toBe(true);
    expect(mockRedisClient.exists).toHaveBeenCalledWith(`test:replay:${txHash}`);

    // Second claim should be rejected as replay
    const claim2 = await protector.claim(txHash, 60);
    expect(claim2.success).toBe(false);
    expect(claim2.error).toContain('replay detected');
  });

  it('should handle expired records gracefully', async () => {
    const memoryKv = new Map<string, string>();
    const expiredEntry = {
      timestamp: Date.now() - 10000,
      expiresAt: Date.now() - 5000,
    };
    memoryKv.set('test:replay:expired_hash', JSON.stringify(expiredEntry));

    const mockRedisClient = {
      get: vi.fn().mockImplementation(async (key: string) => memoryKv.get(key) || null),
      set: vi.fn().mockImplementation(async (key: string, val: string) => {
        memoryKv.set(key, val);
        return 'OK';
      }),
      del: vi.fn().mockImplementation(async (key: string) => (memoryKv.delete(key) ? 1 : 0)),
      exists: vi.fn().mockImplementation(async (key: string) => (memoryKv.has(key) ? 1 : 0)),
    };

    const adapter = new RedisReplayStorageAdapter({
      client: mockRedisClient,
      keyPrefix: 'test:replay:',
    });

    const entry = await adapter.get('expired_hash');
    expect(entry).toBeNull();
    expect(mockRedisClient.del).toHaveBeenCalledWith('test:replay:expired_hash');
  });
});
