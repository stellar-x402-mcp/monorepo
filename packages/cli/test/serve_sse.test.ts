import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { createSSEServer } from '../src/commands/serve.js';

describe('SSE Server & Remote Bearer Authentication', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    server = createSSEServer({
      transport: 'sse',
      network: 'testnet',
      authToken: 'test-secure-bearer-token-12345',
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          port = address.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('should reject unauthenticated requests with HTTP 401 when authToken is configured', async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(401);

    const body = (await res.json()) as any;
    expect(body.error.code).toBe(1000);
    expect(body.error.slug).toBe('ERR_PROTOCOL_UNAUTHORIZED');
    expect(body.error.message).toContain('Missing or invalid Bearer authentication token');
  });

  it('should reject requests with an invalid Bearer token with HTTP 401', async () => {
    const res = await fetch(`http://localhost:${port}/health`, {
      headers: {
        Authorization: 'Bearer wrong-invalid-token',
      },
    });
    expect(res.status).toBe(401);
  });

  it('should allow requests with the valid Bearer token', async () => {
    const res = await fetch(`http://localhost:${port}/health`, {
      headers: {
        Authorization: 'Bearer test-secure-bearer-token-12345',
      },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.status).toBe('healthy');
    expect(body.network).toBe('testnet');
  });

  it('should handle CORS preflight OPTIONS requests without authentication requirement', async () => {
    const res = await fetch(`http://localhost:${port}/sse`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('access-control-allow-headers')).toContain('Authorization');
  });
});
