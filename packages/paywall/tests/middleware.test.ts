import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { x402Express, x402Fastify, x402Hono } from '../src/middleware.js';
import { OnChainTransactionVerifier } from '../src/verifier.js';
import { ReplayProtector } from '../src/replay.js';

describe('Framework Middlewares', () => {
  const merchantAddress = Keypair.random().publicKey();
  let mockVerifier: OnChainTransactionVerifier;
  let replayProtector: ReplayProtector;

  beforeEach(() => {
    mockVerifier = new OnChainTransactionVerifier({ network: 'stellar:testnet' });
    replayProtector = new ReplayProtector();
  });

  describe('x402Express', () => {
    it('should intercept unpaid request with 402 and challenge headers', async () => {
      const middleware = x402Express({
        recipient: merchantAddress,
        price: '0.05',
        verifier: mockVerifier,
        replayProtector,
      });

      const headers: Record<string, string> = {};
      let statusCode = 200;
      let responseBody: any = null;
      let nextCalled = false;

      const req = {
        headers: {},
        url: '/api/v1/analyze',
      };
      const res = {
        setHeader: vi.fn((k: string, v: string) => {
          headers[k] = v;
        }),
        status: vi.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        json: vi.fn((body: any) => {
          responseBody = body;
          return res;
        }),
      };
      const next = vi.fn(() => {
        nextCalled = true;
      });

      await middleware(req, res, next);

      expect(statusCode).toBe(402);
      expect(responseBody.error).toBe('Payment Required');
      expect(responseBody.challenge.price).toBe('0.05');
      expect(headers['WWW-Authenticate']).toContain('X402');
      expect(headers['X-Payment-Challenge']).toBeDefined();
      expect(nextCalled).toBe(false);
    });

    it('should verify valid payment and call next() with req.x402 attached', async () => {
      const txHash = 'aabbcc112233aabbcc112233aabbcc112233aabbcc112233aabbcc112233aabb';
      vi.spyOn(mockVerifier, 'verifyTransactionHash').mockResolvedValue({
        verified: true,
        txHash,
        recipient: merchantAddress,
        amount: '0.05',
        ledger: 998822,
      });

      const middleware = x402Express({
        recipient: merchantAddress,
        price: '0.05',
        verifier: mockVerifier,
        replayProtector,
      });

      const req: any = {
        headers: {
          authorization: `X402 ${txHash}`,
        },
        url: '/api/v1/analyze',
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      let nextCalled = false;
      const next = vi.fn(() => {
        nextCalled = true;
      });

      await middleware(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.x402).toBeDefined();
      expect(req.x402.verified).toBe(true);
      expect(req.x402.txHash).toBe(txHash);
    });

    it('should reject replayed payment transaction hash', async () => {
      const txHash = 'replay_tx_hash_1234567890abcdef1234567890abcdef1234567890abcdef';
      await replayProtector.claim(txHash);

      const middleware = x402Express({
        recipient: merchantAddress,
        price: '0.05',
        verifier: mockVerifier,
        replayProtector,
      });

      let statusCode = 200;
      let responseBody: any = null;
      let nextCalled = false;

      const req: any = {
        headers: { authorization: `Bearer ${txHash}` },
        url: '/api/v1/analyze',
      };
      const res: any = {
        status: vi.fn((code: number) => {
          statusCode = code;
          return res;
        }),
        json: vi.fn((body: any) => {
          responseBody = body;
          return res;
        }),
      };
      const next = vi.fn(() => {
        nextCalled = true;
      });

      await middleware(req, res, next);

      expect(statusCode).toBe(402);
      expect(responseBody.error).toBe('Payment Replay Detected');
      expect(nextCalled).toBe(false);
    });
  });

  describe('x402Fastify', () => {
    it('should intercept unpaid Fastify request with 402 challenge', async () => {
      const plugin = x402Fastify({
        recipient: merchantAddress,
        price: '0.01',
        verifier: mockVerifier,
        replayProtector,
      });

      let statusCode = 200;
      let sentBody: any = null;
      const headers: Record<string, string> = {};

      const request: any = {
        headers: {},
        url: '/fastify/api',
      };
      const reply: any = {
        header: vi.fn((k: string, v: string) => {
          headers[k] = v;
          return reply;
        }),
        code: vi.fn((code: number) => {
          statusCode = code;
          return reply;
        }),
        send: vi.fn((body: any) => {
          sentBody = body;
          return reply;
        }),
      };

      await plugin(request, reply);

      expect(statusCode).toBe(402);
      expect(sentBody.error).toBe('Payment Required');
      expect(headers['WWW-Authenticate']).toBeDefined();
    });
  });

  describe('x402Hono', () => {
    it('should intercept unpaid Hono request and return 402 JSON response', async () => {
      const middleware = x402Hono({
        recipient: merchantAddress,
        price: '0.02',
        verifier: mockVerifier,
        replayProtector,
      });

      let nextCalled = false;
      const headersSet: Record<string, string> = {};

      const c: any = {
        req: {
          url: 'https://hono.example.com/api',
          header: vi.fn(() => undefined),
        },
        header: vi.fn((k: string, v: string) => {
          headersSet[k] = v;
        }),
        json: vi.fn((body: any, status: number) => ({ body, status })),
        set: vi.fn(),
      };

      const next = vi.fn(async () => {
        nextCalled = true;
      });

      const response: any = await middleware(c, next);

      expect(response.status).toBe(402);
      expect(response.body.error).toBe('Payment Required');
      expect(headersSet['WWW-Authenticate']).toBeDefined();
      expect(nextCalled).toBe(false);
    });
  });
});
