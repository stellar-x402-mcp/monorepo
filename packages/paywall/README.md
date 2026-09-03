# @stellar-mcp/paywall

Decorator and error handling framework to monetize custom Model Context Protocol (MCP) tools using HTTP 402 paywalls settled on Stellar.

## Usage

```ts
import { x402Tool } from '@stellar-mcp/paywall';

export const analyzeRisk = x402Tool({
  price: '0.01', // 0.01 USDC
  asset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
  recipient: 'GD...',
  network: 'stellar:testnet',
  handler: async (args) => {
    return { score: 98, status: 'approved' };
  }
});
```

When an unpaid AI agent calls `analyzeRisk`, it throws a `PaymentRequiredError` containing the 402 challenge parameters, which any compliant x402 agent client can automatically sign and resolve.
