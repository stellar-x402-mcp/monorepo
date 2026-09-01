# Context: stellar-x402-mcp

Onboarding for a fresh session, AI or human. Read this before touching code. Updated at phase transitions, not at every commit.

## 1. What stellar-x402-mcp is

Model Context Protocol (MCP) is the open standard introduced by Anthropic in late 2024 (and standardized across the AI industry in 2025/2026) that connects LLM clients (Claude Desktop, Cursor, AI agents) to external tools and databases.

`stellar-x402-mcp` delivers two critical capabilities at this intersection:
1. **Stellar Tools for AI Agents**: Standardized MCP server exposing the complete surface of Stellar Horizon and Soroban RPC (account balances, SAC tokens, contract simulation, contract invocation, and path payment routing).
2. **x402 Monetization Framework (`@x402Paywall`)**: A lightweight wrapper allowing any developer who writes an MCP tool to charge calling agents per invocation in USDC or XLM using the x402 protocol.

## 2. Monorepo Workspaces

- `packages/server` (`@stellar-mcp/server`): The core MCP server implementing both `stdio` and Server-Sent Events (`SSE`) transports.
- `packages/paywall` (`@stellar-mcp/paywall`): The decorator/interceptor that checks payment signatures before executing paywalled MCP tools.
- `packages/client` (`@stellar-mcp/agent-client`): MCP client wrapper with built-in wallet signer, daily spending limits, and automated 402 challenge resolution.

## 3. Tool Inventory

The MCP server exposes the following tools to connected AI agents:
- `stellar_get_balance`: Queries native XLM and SAC token balances for an address.
- `stellar_get_account`: Fetches account sequence, signers, and thresholds.
- `soroban_simulate_invocation`: Dry-runs a Soroban contract call and returns resource footprint, events, and return value.
- `soroban_invoke_contract`: Signs and submits a Soroban contract transaction.
- `soroban_query_events`: Queries contract event logs with cursor and ledger filters.
- `stellar_swap_tokens`: Finds optimal path payments and swaps assets on the Stellar DEX.
