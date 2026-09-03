# @stellar-mcp/agent-client

Autonomous Model Context Protocol (MCP) client with budget limits and automatic x402 payment signing for Stellar tools.

## Features

- **Automated Handshake**: Catches `PaymentRequiredError` thrown by paywalled tools, signs authorizations, and retries calls.
- **Budget Guardrails**: Enforces `maxSpendPerCall` and `maxDailySpend` limits before signing transactions.

## Example

```ts
import { X402AgentMcpClient } from '@stellar-mcp/agent-client';

const client = new X402AgentMcpClient({
  payerAddress: 'GB...',
  budgetPolicy: {
    maxSpendPerCall: 0.05,
    maxDailySpend: 1.0,
  },
  signAuthorization: async (challenge) => {
    // Sign Soroban authorization entry using agent wallet
    return signChallenge(challenge);
  },
});

const result = await client.invokeTool(paywalledTool, { query: 'market' });
```
