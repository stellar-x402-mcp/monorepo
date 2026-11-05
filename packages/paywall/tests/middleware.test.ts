import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { x402Express, x402Fastify, x402Hono, x402WebStandard, x402NextHandler } from '../src/middleware.js';
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

  describe('x402WebStandard', () => {
    it('should return 402 Response with challenge headers on unpaid Request', async () => {
      const request = new Request('https://api.example.com/api/v1/resource', {
        method: 'GET',
      });

      const authResult = await x402WebStandard(request, {
        recipient: merchantAddress,
        price: '0.25',
        verifier: mockVerifier,
        replayProtector,
      });

      expect(authResult.authorized).toBe(false);
      if (!authResult.authorized) {
        expect(authResult.response.status).toBe(402);
        expect(authResult.response.headers.get('WWW-Authenticate')).toContain('X402');
        expect(authResult.response.headers.get('X-Payment-Challenge')).toBeDefined();

        const body = await authResult.response.json();
        expect(body.error).toBe('Payment Required');
        expect(body.challenge.price).toBe('0.25');
      }
    });

    it('should return 402 with replay error when duplicate tx hash is presented', async () => {
      const dummyTxHash = '1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';
      // Pre-claim hash in replay protector
      await replayProtector.claim(dummyTxHash);

      const request = new Request('https://api.example.com/api/v1/resource', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${dummyTxHash}`,
        },
      });

      const authResult = await x402WebStandard(request, {
        recipient: merchantAddress,
        price: '0.25',
        verifier: mockVerifier,
        replayProtector,
      });

      expect(authResult.authorized).toBe(false);
      if (!authResult.authorized) {
        expect(authResult.response.status).toBe(402);
        const body = await authResult.response.json();
        expect(body.error).toBe('Payment Replay Detected');
        expect(body.standardError.code).toBe(1160);
      }
    });

    it('should authorize request when valid payment hash is verified', async () => {
      const dummyTxHash = '9999888877776666555544443333222211110000aaaabbbbccccddddeeeeffff';
      vi.spyOn(mockVerifier, 'verifyTransactionHash').mockResolvedValueOnce({
        verified: true,
        txHash: dummyTxHash,
        payer: 'G_DUMMY_PAYER',
        amount: '0.25',
        asset: 'native',
      });

      const request = new Request('https://api.example.com/api/v1/resource', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${dummyTxHash}`,
        },
      });

      const authResult = await x402WebStandard(request, {
        recipient: merchantAddress,
        price: '0.25',
        verifier: mockVerifier,
        replayProtector,
      });

      expect(authResult.authorized).toBe(true);
      if (authResult.authorized) {
        expect(authResult.context.verified).toBe(true);
        expect(authResult.context.payer).toBe('G_DUMMY_PAYER');
      }
    });
  });

  describe('x402NextHandler', () => {
    it('should block unpaid Next.js route request with 402 Response', async () => {
      const routeHandler = vi.fn(async () => new Response(JSON.stringify({ ok: true })));
      const wrappedHandler = x402NextHandler(routeHandler, {
        recipient: merchantAddress,
        price: '0.10',
        verifier: mockVerifier,
        replayProtector,
      });

      const req = new Request('https://nextjs.example.com/api/premium');
      const response = await wrappedHandler(req);

      expect(response.status).toBe(402);
      expect(routeHandler).not.toHaveBeenCalled();
    });

    it('should forward payment context to downstream handler on authorized request', async () => {
      const validHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      vi.spyOn(mockVerifier, 'verifyTransactionHash').mockResolvedValueOnce({
        verified: true,
        txHash: validHash,
        payer: 'G_AUTHORIZED_PAYER',
        amount: '0.10',
      });

      const routeHandler = vi.fn(async (_req: Request, ctx: any) => {
        return Response.json({ status: 'unlocked', payer: ctx.payment.payer });
      });

      const wrappedHandler = x402NextHandler(routeHandler, {
        recipient: merchantAddress,
        price: '0.10',
        verifier: mockVerifier,
        replayProtector,
      });

      const req = new Request('https://nextjs.example.com/api/premium', {
        headers: { authorization: `X402 ${validHash}` },
      });
      const response = await wrappedHandler(req);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('unlocked');
      expect(data.payer).toBe('G_AUTHORIZED_PAYER');
      expect(routeHandler).toHaveBeenCalledOnce();
    });
  });
});

