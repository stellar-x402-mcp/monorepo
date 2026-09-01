# stellar-x402-mcp

[![CI](https://github.com/stellar-x402-mcp/monorepo/actions/workflows/ci.yml/badge.svg)](https://github.com/stellar-x402-mcp/monorepo/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

`stellar-x402-mcp` is an open-source Model Context Protocol (MCP) server and agent-monetization framework for the Stellar blockchain. It equips autonomous AI agents with typed, validated tools for inspecting ledger state, checking SAC token balances, simulating and invoking Soroban smart contracts, and executing DEX path payments across Stellar networks. Additionally, it provides `@x402Paywall`, an open-source decorator and middleware layer that enables any MCP server developer to monetize their custom AI tools with instant, pay-per-call Stellar stablecoin settlements, enabling trustless machine-to-machine commerce for the decentralized AI economy.

## Packages

- **`@stellar-mcp/server`**: Canonical MCP server exposing Stellar RPC and Horizon tools (stdio & SSE transports).
- **`@stellar-mcp/paywall`**: `@x402Tool` decorator for adding HTTP 402 / JSON-RPC paywalls to custom MCP tools.
- **`@stellar-mcp/agent-client`**: MCP client with automated x402 signing, spending policies, and budget guardrails.

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
