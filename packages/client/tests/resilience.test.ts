import { describe, expect, it, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  IdempotencyTracker,
  calculateJitteredBackoff,
  pollTransactionUntilFinal,
} from '../src/resilience.js';

describe('Resilience Pipeline (IndigoPay Model)', () => {
  it('CircuitBreaker stays CLOSED on successful calls', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    const action = vi.fn().mockResolvedValue('success');

    const res = await cb.execute(action);
    expect(res).toBe('success');
    expect(cb.getState()).toBe('CLOSED');
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('CircuitBreaker transitions to OPEN after failureThreshold reached and fast-fails', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 50 });
    const failingAction = vi.fn().mockRejectedValue(new Error('RPC network drop'));

    // First failure
    await expect(cb.execute(failingAction)).rejects.toThrow('RPC network drop');
    expect(cb.getState()).toBe('CLOSED');

    // Second failure trips the breaker
    await expect(cb.execute(failingAction)).rejects.toThrow('RPC network drop');
    expect(cb.getState()).toBe('OPEN');

    // Third call should fail fast with CircuitBreakerOpenError and 0 calls to underlying action
    const callsBefore = failingAction.mock.calls.length;
    await expect(cb.execute(failingAction)).rejects.toThrow(CircuitBreakerOpenError);
    expect(failingAction.mock.calls.length).toBe(callsBefore);
  });

  it('CircuitBreaker transitions to HALF_OPEN after resetTimeoutMs and resets on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 20 });
    const failingAction = vi.fn().mockRejectedValue(new Error('Transient 503'));

    await expect(cb.execute(failingAction)).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 30));
    expect(cb.getState()).toBe('HALF_OPEN');

    // Successful probe resets to CLOSED
    const successAction = vi.fn().mockResolvedValue('recovered');
    const res = await cb.execute(successAction);
    expect(res).toBe('recovered');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('calculateJitteredBackoff returns values within bounded jitter range', () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      const delay = calculateJitteredBackoff(attempt, 100, 1000);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(1000);
    }
  });

  it('pollTransactionUntilFinal rejects intermediate PENDING and resolves on SUCCESS', async () => {
    let calls = 0;
    const pollFn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls < 3) {
        return { status: 'PENDING' as const };
      }
      return { status: 'SUCCESS' as const, data: { ledger: 12345, txHash: 'abc' } };
    });

    const result = await pollTransactionUntilFinal({
      pollFn,
      maxTimeoutMs: 2000,
      intervalMs: 10,
    });

    expect(result).toEqual({ ledger: 12345, txHash: 'abc' });
    expect(calls).toBe(3);
  });

  it('pollTransactionUntilFinal throws immediately on FAILED status', async () => {
    const pollFn = vi.fn().mockResolvedValue({
      status: 'FAILED' as const,
      error: 'op_underfunded',
    });

    await expect(
      pollTransactionUntilFinal({
        pollFn,
        maxTimeoutMs: 2000,
        intervalMs: 10,
      })
    ).rejects.toThrow('Transaction finalized with status FAILED: op_underfunded');
  });

  it('IdempotencyTracker accurately tracks envelope hashes', () => {
    const tracker = new IdempotencyTracker();
    const hash = '3f7a1b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a';

    expect(tracker.isDuplicate(hash)).toBe(false);
    expect(tracker.register(hash)).toBe(true);
    expect(tracker.isDuplicate(hash)).toBe(true);
    expect(tracker.register(hash)).toBe(false);

    tracker.clear();
    expect(tracker.isDuplicate(hash)).toBe(false);
  });
});
