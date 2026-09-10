import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  InMemoryWalletSigner,
  X402AgentMcpClient,
  CircuitBreaker,
} from '@stellar-mcp/agent-client';
import {
  PaymentRequiredError,
  ReplayProtector,
  getErrorCode,
  listErrorCodes,
  formatErrorPayload,
} from '@stellar-mcp/paywall';

describe('Milestone 14: Stress Testing & Resilience Under Adverse Conditions', () => {
  const merchantAddress = 'GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT';
  const usdcContractId = 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC';

  let replayProtector: ReplayProtector;
  let agentSigner: InMemoryWalletSigner;

  beforeEach(() => {
    replayProtector = new ReplayProtector({ defaultTtlSeconds: 3600 });
    agentSigner = InMemoryWalletSigner.random();
  });

  it('handles high concurrency micro-payment burst: 50 parallel requests without race conditions', async () => {
    const concurrency = 50;
    const client = new X402AgentMcpClient({
      signer: agentSigner,
      budgetPolicy: {
        maxDailySpend: 50.0,
        maxSpendPerCall: 0.1,
      },
      signAuthorization: async (challenge) => {
        return crypto
          .createHash('sha256')
          .update(`${challenge.nonce || crypto.randomUUID()}:${Date.now()}:${Math.random()}`)
          .digest('hex');
      },
    });

    let activeRequests = 0;
    let maxSimultaneousRequests = 0;
    const settledHashes = new Set<string>();

    const concurrentTool = async (args: { index: number }, context?: any) => {
      activeRequests++;
      if (activeRequests > maxSimultaneousRequests) {
        maxSimultaneousRequests = activeRequests;
      }

      try {
        if (!context?.paymentSignature) {
          const nonce = crypto.randomBytes(16).toString('hex');
          throw new PaymentRequiredError({
            version: 'x402-v1',
            network: 'stellar:testnet',
            asset: usdcContractId,
            price: '0.01',
            recipient: merchantAddress,
            validUntil: Math.floor(Date.now() / 1000) + 300,
            nonce,
          });
        }

        // Validate on-chain replay protection
        const claimResult = await replayProtector.claim(context.paymentSignature);
        if (!claimResult.success) {
          throw new Error(`Replay error: ${claimResult.error}`);
        }

        settledHashes.add(context.paymentSignature);

        return {
          index: args.index,
          status: 'ok',
          processedAt: Date.now(),
        };
      } finally {
        activeRequests--;
      }
    };

    // Execute 50 parallel tool requests
    const tasks = Array.from({ length: concurrency }, (_, i) =>
      client.invokeTool((args, ctx) => concurrentTool(args, ctx), { index: i })
    );

    const results = await Promise.all(tasks);

    expect(results.length).toBe(concurrency);
    expect(settledHashes.size).toBe(concurrency);
    expect(maxSimultaneousRequests).toBeGreaterThan(1);

    for (let i = 0; i < concurrency; i++) {
      expect(results[i].status).toBe('ok');
      expect(results[i].index).toBe(i);
    }
  });

  it('blocks replay attacks: duplicate transaction hash rejection with Error Code 1160', async () => {
    const replayCode = getErrorCode(1160);
    expect(replayCode).toBeDefined();
    expect(replayCode?.slug).toBe('ERR_REPLAY_TX_HASH_CLAIMED');
    expect(replayCode?.category).toBe('REPLAY');
    expect(replayCode?.retryable).toBe(false);

    const client = new X402AgentMcpClient({
      signer: agentSigner,
      budgetPolicy: {
        maxDailySpend: 10.0,
        maxSpendPerCall: 0.05,
      },
    });

    const fixedPaymentHash = 'tx_hash_fixed_adversarial_replay_0001';

    // Seed replay protector with already claimed transaction
    const firstClaim = await replayProtector.claim(fixedPaymentHash);
    expect(firstClaim.success).toBe(true);

    const paywalledEndpoint = async (_args: any, context?: any) => {
      if (!context?.paymentSignature) {
        throw new PaymentRequiredError({
          version: 'x402-v1',
          network: 'stellar:testnet',
          asset: usdcContractId,
          price: '0.01',
          recipient: merchantAddress,
        });
      }

      const claim = await replayProtector.claim(context.paymentSignature);
      if (!claim.success) {
        const errPayload = formatErrorPayload(1160, {
          txHash: context.paymentSignature,
          reason: claim.error,
        });
        const err = new Error(errPayload.message);
        (err as any).code = errPayload.code;
        (err as any).slug = errPayload.slug;
        (err as any).category = errPayload.category;
        throw err;
      }

      return { success: true };
    };

    // Attempt to invoke paywalled endpoint with already claimed hash
    await expect(
      paywalledEndpoint({ id: 'test' }, { paymentSignature: fixedPaymentHash })
    ).rejects.toMatchObject({
      code: 1160,
      slug: 'ERR_REPLAY_TX_HASH_CLAIMED',
      category: 'REPLAY',
    });
  });

  it('trips circuit breaker under repeated transport failures with Error Code 1005 and recovers', async () => {
    const transportClosed = getErrorCode(1005);
    expect(transportClosed).toBeDefined();
    expect(transportClosed?.slug).toBe('ERR_PROTOCOL_TRANSPORT_CLOSED');

    const circuitOpen = getErrorCode(1198);
    expect(circuitOpen).toBeDefined();
    expect(circuitOpen?.slug).toBe('ERR_CLIENT_CIRCUIT_OPEN');

    const circuit = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 150,
    });

    let callAttempts = 0;
    let serviceHealthy = false;

    const flakyRpcService = async () => {
      callAttempts++;
      if (!serviceHealthy) {
        const err = new Error('Transport stream disconnected');
        (err as any).code = 1005;
        throw err;
      }
      return { connected: true };
    };

    // Trigger 3 consecutive failures to open circuit
    for (let i = 0; i < 3; i++) {
      await expect(circuit.execute(flakyRpcService)).rejects.toThrow();
    }

    expect(circuit.getState()).toBe('OPEN');
    expect(callAttempts).toBe(3);

    // Subsequent call should fail fast without invoking downstream service
    await expect(circuit.execute(flakyRpcService)).rejects.toThrow(/Circuit breaker is OPEN/);
    expect(callAttempts).toBe(3); // Unchanged due to fail-fast

    // Wait for cooldown period to elapse
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Service recovers
    serviceHealthy = true;
    const recoveredResult = await circuit.execute(flakyRpcService);
    expect(recoveredResult.connected).toBe(true);
    expect(circuit.getState()).toBe('CLOSED');
  });

  it('enforces single-call spending cap with Error Code 1190', async () => {
    const capCode = getErrorCode(1190);
    expect(capCode).toBeDefined();
    expect(capCode?.slug).toBe('ERR_CLIENT_BUDGET_CALL_EXCEEDED');

    const client = new X402AgentMcpClient({
      signer: agentSigner,
      budgetPolicy: {
        maxDailySpend: 10.0,
        maxSpendPerCall: 0.05, // Cap is 0.05 USDC
      },
    });

    const expensiveTool = async (_args: any) => {
      throw new PaymentRequiredError({
        version: 'x402-v1',
        network: 'stellar:testnet',
        asset: usdcContractId,
        price: '0.10', // Exceeds 0.05 maxSpendPerCall
        recipient: merchantAddress,
      });
    };

    await expect(
      client.invokeTool((args) => expensiveTool(args), {})
    ).rejects.toThrow(/Budget exceeded/);
  });

  it('enforces rolling daily budget cap with Error Code 1192', async () => {
    const dailyCode = getErrorCode(1192);
    expect(dailyCode).toBeDefined();
    expect(dailyCode?.slug).toBe('ERR_CLIENT_BUDGET_DAILY_EXCEEDED');

    const client = new X402AgentMcpClient({
      signer: agentSigner,
      budgetPolicy: {
        maxDailySpend: 0.03, // Small daily budget
        maxSpendPerCall: 0.05,
      },
    });

    const meteredTool = async (_args: any, context?: any) => {
      if (!context?.paymentSignature) {
        throw new PaymentRequiredError({
          version: 'x402-v1',
          network: 'stellar:testnet',
          asset: usdcContractId,
          price: '0.01',
          recipient: merchantAddress,
        });
      }
      return { success: true };
    };

    // Invocations 1, 2, 3 succeed (0.01 * 3 = 0.03 consumed)
    await client.invokeTool(meteredTool, {});
    await client.invokeTool(meteredTool, {});
    await client.invokeTool(meteredTool, {});

    // Invocation 4 exceeds daily limit
    await expect(
      client.invokeTool(meteredTool, {})
    ).rejects.toThrow(/Budget exceeded/);
  });

  it('verifies universal 250 error codes registry coverage across all domains', () => {
    const allCodes = listErrorCodes();
    expect(allCodes.length).toBe(250);

    const categories = [
      'PROTOCOL',
      'HORIZON',
      'SOROBAN',
      'PAYWALL',
      'REPLAY',
      'CLIENT',
      'DEX',
    ];

    for (const cat of categories) {
      const inCat = allCodes.filter((c) => c.category === cat);
      expect(inCat.length).toBeGreaterThan(10);
    }

    // Verify key security and transaction error codes
    expect(getErrorCode(1001)?.slug).toBe('ERR_PROTOCOL_METHOD_NOT_FOUND');
    expect(getErrorCode(1040)?.slug).toBe('ERR_HORIZON_ACCOUNT_NOT_FOUND');
    expect(getErrorCode(1081)?.slug).toBe('ERR_SOROBAN_HOST_TRAP');
    expect(getErrorCode(1120)?.slug).toBe('ERR_PAYWALL_PAYMENT_REQUIRED');
    expect(getErrorCode(1160)?.slug).toBe('ERR_REPLAY_TX_HASH_CLAIMED');
    expect(getErrorCode(1190)?.slug).toBe('ERR_CLIENT_BUDGET_CALL_EXCEEDED');
    expect(getErrorCode(1220)?.slug).toBe('ERR_DEX_NO_PAYMENT_PATH');
  });
});
