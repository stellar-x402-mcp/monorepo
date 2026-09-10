import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/e2e/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      '@stellar-mcp/paywall': path.resolve(__dirname, 'packages/paywall/src/index.ts'),
      '@stellar-mcp/agent-client': path.resolve(__dirname, 'packages/client/src/index.ts'),
      '@stellar-mcp/server': path.resolve(__dirname, 'packages/server/src/index.ts'),
      '@stellar-mcp/adapters': path.resolve(__dirname, 'packages/adapters/src/index.ts'),
      '@stellar-mcp/cli': path.resolve(__dirname, 'packages/cli/src/index.ts'),
    },
  },
});
