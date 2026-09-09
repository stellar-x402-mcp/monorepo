import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOracleServer } from './server.js';
import { defaultConfig, OracleConfig } from './config.js';

export * from './config.js';
export * from './server.js';
export * from './tools/price.js';
export * from './tools/tvl.js';
export * from './tools/route.js';

export async function runOracleServer(userConfig: Partial<OracleConfig> = {}) {
  const { server, config } = createOracleServer(userConfig);

  if (config.transport === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(
      `[paywalled-oracle] Server running on stdio (${config.network}). Recipient: ${config.merchantAddress}`
    );
  } else {
    console.error(
      `[paywalled-oracle] Server configured for SSE transport on port ${config.port} (${config.network})`
    );
  }

  return { server, config };
}

// Auto-run if executed directly as main script
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('stellar-oracle-server'));

if (isMain) {
  runOracleServer().catch((err) => {
    console.error('[paywalled-oracle] Fatal startup error:', err);
    process.exit(1);
  });
}
