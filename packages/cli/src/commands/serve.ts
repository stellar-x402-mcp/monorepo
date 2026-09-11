import http from 'node:http';
import { createStellarMcpServer } from '@stellar-mcp/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export interface ServeOptions {
  transport?: 'stdio' | 'sse' | undefined;
  network?: 'testnet' | 'pubnet' | undefined;
  port?: string | number | undefined;
  horizonUrl?: string | undefined;
  rpcUrl?: string | undefined;
  authToken?: string | undefined;
}

export function createSSEServer(options: ServeOptions = {}): http.Server {
  const network = options.network || 'testnet';
  const horizonUrl =
    options.horizonUrl ||
    (network === 'pubnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org');

  const rpcUrl =
    options.rpcUrl ||
    (network === 'pubnet'
      ? 'https://mainnet.sorobanrpc.com'
      : 'https://soroban-testnet.stellar.org');

  const server = createStellarMcpServer({
    horizonUrl,
    sorobanRpcUrl: rpcUrl,
  });

  const activeTransports = new Map<string, SSEServerTransport>();

  const httpServer = http.createServer(async (req, res) => {
    // CORS headers for web/IDE clients
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Remote Bearer Token Authentication
    if (options.authToken) {
      const authHeader = req.headers['authorization'];
      const expected = `Bearer ${options.authToken}`;
      if (!authHeader || authHeader !== expected) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: {
              code: 1000,
              slug: 'ERR_PROTOCOL_UNAUTHORIZED',
              message: 'Unauthorized: Missing or invalid Bearer authentication token',
            },
          })
        );
        return;
      }
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/sse') {
      const transport = new SSEServerTransport('/messages', res);
      activeTransports.set(transport.sessionId, transport);
      transport.onclose = () => {
        activeTransports.delete(transport.sessionId);
      };
      await server.connect(transport);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/messages') {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId || !activeTransports.has(sessionId)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: {
              code: 1001,
              message: 'Invalid or missing sessionId query parameter',
            },
          })
        );
        return;
      }

      const transport = activeTransports.get(sessionId)!;
      await transport.handlePostMessage(req, res);
      return;
    }

    // Health check endpoint
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'healthy',
          network,
          activeSessions: activeTransports.size,
        })
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  return httpServer;
}

export async function runServe(options: ServeOptions = {}): Promise<void> {
  const transportType = options.transport || 'stdio';
  const network = options.network || 'testnet';
  const port = options.port ? Number(options.port) : 3000;

  const horizonUrl =
    options.horizonUrl ||
    (network === 'pubnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org');

  const rpcUrl =
    options.rpcUrl ||
    (network === 'pubnet'
      ? 'https://mainnet.sorobanrpc.com'
      : 'https://soroban-testnet.stellar.org');

  const server = createStellarMcpServer({
    horizonUrl,
    sorobanRpcUrl: rpcUrl,
  });

  if (transportType === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[stellar-mcp] Server running on stdio (${network})`);
  } else if (transportType === 'sse') {
    const sseServer = createSSEServer({ ...options, port, network, horizonUrl, rpcUrl });
    sseServer.listen(port, () => {
      console.error(`[stellar-mcp] Server running on SSE http://localhost:${port} (${network})`);
      if (options.authToken) {
        console.error(`[stellar-mcp] Bearer Token authentication enabled`);
      }
    });
  }
}
