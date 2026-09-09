import { createStellarMcpServer, runStdioServer } from '@stellar-mcp/server';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export interface ServeOptions {
  transport?: 'stdio' | 'sse' | undefined;
  network?: 'testnet' | 'pubnet' | undefined;
  port?: string | number | undefined;
  horizonUrl?: string | undefined;
  rpcUrl?: string | undefined;
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
    console.error(`[stellar-mcp] Server running on SSE http://localhost:${port} (${network})`);
  }
}
