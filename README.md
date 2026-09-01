# stellar-x402-mcp

[![CI](https://github.com/stellar-x402-mcp/monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/stellar-x402-mcp/monorepo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

stellar-x402-mcp is an MCP server and tool monetization library for the Stellar network. It gives AI models structured tools to read account balances, inspect Soroban state, simulate transactions, and execute DEX path payments. It also exports the @x402Tool decorator, which lets tool authors charge AI agents micro-fees in Stellar stablecoins for each tool call, with built-in spending limits and automated signing on the client side.

## Packages

- **`@stellar-mcp/server`**: MCP server exposing Stellar RPC and Horizon tools over stdio and SSE transports.
- **`@stellar-mcp/paywall`**: `@x402Tool` decorator for adding HTTP 402 / JSON-RPC paywalls to custom MCP tools.
- **`@stellar-mcp/agent-client`**: MCP client with automated x402 signing, spending policies, and budget limits.

## Quickstart

### 1. Claude Desktop Setup
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "stellar": {
      "command": "npx",
      "args": ["-y", "@stellar-mcp/server", "--network", "testnet"]
    }
  }
}
```

### 2. Monetizing Custom MCP Tools with `@x402Tool`
```ts
import { x402Tool } from '@stellar-mcp/paywall';

export const analyzeFinancialData = x402Tool({
  price: '0.005', // 0.005 USDC per call
  asset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  recipient: 'GD...',
  network: 'stellar:testnet',
  handler: async (args) => {
    return { analysis: "..." };
  }
});
```

## License
Apache-2.0
