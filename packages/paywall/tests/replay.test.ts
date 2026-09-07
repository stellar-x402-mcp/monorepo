import { describe, it, expect, vi } from 'vitest';
import { ReplayProtector, MemoryReplayStorageAdapter } from '../src/replay.js';

describe('ReplayProtector', () => {
  it('should successfully claim an unused transaction hash', async () => {
    const protector = new ReplayProtector();
    const txHash = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';

    const result = await protector.claim(txHash);
    expect(result.success).toBe(true);
    expect(await protector.has(txHash)).toBe(true);
    expect(await protector.size()).toBe(1);
  });

  it('should detect and reject replayed transaction hashes', async () => {
    const protector = new ReplayProtector();
    const txHash = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';

    const firstClaim = await protector.claim(txHash);
    expect(firstClaim.success).toBe(true);

    const secondClaim = await protector.claim(txHash);
    expect(secondClaim.success).toBe(false);
    expect(secondClaim.error).toContain('replay detected');
  });

  it('should normalize transaction hashes with whitespace and casing', async () => {
    const protector = new ReplayProtector();
    const txHashUpper = '  AABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899  ';
    const txHashLower = 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899';

    await protector.claim(txHashUpper);
    const replayAttempt = await protector.claim(txHashLower);

    expect(replayAttempt.success).toBe(false);
    expect(replayAttempt.error).toContain('replay detected');
  });

  it('should reject empty or whitespace-only transaction hashes', async () => {
    const protector = new ReplayProtector();
    const result = await protector.claim('   ');

    expect(result.success).toBe(false);
    expect(result.error).toContain('Empty transaction hash');
  });

  it('should allow re-claim after TTL expiration', async () => {
    const protector = new ReplayProtector({ defaultTtlSeconds: 1 });
    const txHash = 'temp_hash_for_expiry';

    await protector.claim(txHash, 1);
    expect(await protector.has(txHash)).toBe(true);

    // Fast-forward or sleep 1.1s
    await new Promise((r) => setTimeout(r, 1100));

    expect(await protector.has(txHash)).toBe(false);

    const reClaim = await protector.claim(txHash, 1);
    expect(reClaim.success).toBe(true);
  });

  it('should prune expired records and report pruned count', async () => {
    const adapter = new MemoryReplayStorageAdapter();
    const protector = new ReplayProtector({ adapter });

    await protector.claim('tx_1', 1);
    await protector.claim('tx_2', 100);

    await new Promise((r) => setTimeout(r, 1100));

    const pruned = await protector.prune();
    expect(pruned).toBe(1);
    expect(await protector.has('tx_1')).toBe(false);
    expect(await protector.has('tx_2')).toBe(true);
  });

  it('should evict oldest entry when capacity is reached', async () => {
    const adapter = new MemoryReplayStorageAdapter(2);
    const protector = new ReplayProtector({ adapter });

    await protector.claim('tx_a', 100);
    await protector.claim('tx_b', 100);
    await protector.claim('tx_c', 100);

    expect(await protector.size()).toBe(2);
    expect(await protector.has('tx_a')).toBe(false); // Evicted oldest
    expect(await protector.has('tx_b')).toBe(true);
    expect(await protector.has('tx_c')).toBe(true);
  });
});
