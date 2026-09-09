export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number | undefined;
  resetTimeoutMs?: number | undefined;
}

export class CircuitBreakerOpenError extends Error {
  public readonly code = 1198;
  public readonly slug = 'ERR_CLIENT_CIRCUIT_OPEN';

  constructor(message = 'Circuit breaker is OPEN: fast-failing to protect upstream node') {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(options?: CircuitBreakerOptions) {
    this.failureThreshold = options?.failureThreshold ?? 3;
    this.resetTimeoutMs = options?.resetTimeoutMs ?? 5000;
  }

  public getState(): CircuitState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  public async execute<T>(action: () => Promise<T>, isRetryableError?: (err: any) => boolean): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      throw new CircuitBreakerOpenError();
    }

    try {
      const result = await action();
      this.onSuccess();
      return result;
    } catch (err: any) {
      const shouldTrip = isRetryableError ? isRetryableError(err) : true;
      if (shouldTrip) {
        this.onFailure();
      }
      throw err;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  public reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

/**
 * Calculates exponential backoff with full jitter to avoid thundering herd.
 */
export function calculateJitteredBackoff(
  attempt: number,
  baseMs = 200,
  maxMs = 3000,
  factor = 2
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(factor, attempt));
  // Full jitter: uniformly distributed between 0 and exponential delay
  return Math.floor(Math.random() * exponential);
}

export interface PollFinalityOptions<T> {
  pollFn: () => Promise<{ status: 'SUCCESS' | 'FAILED' | 'PENDING'; data?: T; error?: string }>;
  maxTimeoutMs?: number | undefined;
  intervalMs?: number | undefined;
}

/**
 * Polls Horizon or Soroban RPC transaction status until terminal finality (SUCCESS or FAILED).
 * Explicitly rejects intermediate PENDING state as non-final.
 */
export async function pollTransactionUntilFinal<T>(
  options: PollFinalityOptions<T>
): Promise<T> {
  const maxTimeout = options.maxTimeoutMs ?? 15000;
  const interval = options.intervalMs ?? 500;
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxTimeout) {
    const res = await options.pollFn();

    if (res.status === 'SUCCESS') {
      return res.data as T;
    }

    if (res.status === 'FAILED') {
      throw new Error(`Transaction finalized with status FAILED: ${res.error || 'Unknown ledger failure'}`);
    }

    // Status is PENDING: wait with jittered backoff before next poll
    attempt++;
    const sleepDuration = Math.min(interval, calculateJitteredBackoff(attempt, interval / 2, interval));
    await new Promise((resolve) => setTimeout(resolve, sleepDuration));
  }

  throw new Error(`Transaction finality polling timed out after ${maxTimeout}ms`);
}

/**
 * In-memory idempotency tracker anchoring on transaction envelope hashes.
 */
export class IdempotencyTracker {
  private seenHashes = new Set<string>();

  public isDuplicate(envelopeHash: string): boolean {
    return this.seenHashes.has(envelopeHash.toLowerCase());
  }

  public register(envelopeHash: string): boolean {
    const key = envelopeHash.toLowerCase();
    if (this.seenHashes.has(key)) {
      return false;
    }
    this.seenHashes.add(key);
    return true;
  }

  public clear(): void {
    this.seenHashes.clear();
  }
}
