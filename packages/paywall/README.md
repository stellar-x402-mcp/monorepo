# @stellar-mcp/paywall

Decorator, verifier, and middleware framework to monetize custom Model Context Protocol (MCP) tools using HTTP 402 paywalls settled on Stellar.

## Features
- `@x402Tool`: Higher-order decorator intercepting unpaid MCP tool calls with structured 402 challenge errors.
- `OnChainTransactionVerifier`: Cryptographic and on-chain payment verification engine validating transaction hashes and signed envelopes against Horizon and Soroban RPC.
- `ReplayProtector`: In-memory and cache-backed storage preventing duplicate submission of the same transaction hash with TTL expiration and LRU eviction.
- `PaymentChallengeGenerator`: Standardized generator for SEP-0043 / x402-compliant cryptographic challenges, nonces, and HTTP authentication headers.
- `DynamicPricingEngine`: Flexible pricing engine supporting fixed rates, token-based meter pricing, tiered usage brackets, and dynamic compute functions.
- `Framework Middlewares`: Ready-to-use middleware for Express (`x402Express`), Fastify (`x402Fastify`), and Hono / Web Standards (`x402Hono`).

## Usage

### Monetizing Tools with `@x402Tool`

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

### Verifying Payments with `OnChainTransactionVerifier`

```ts
import { OnChainTransactionVerifier } from '@stellar-mcp/paywall';

const verifier = new OnChainTransactionVerifier({
  network: 'stellar:testnet',
});

// Verify by submitted transaction hash
const result = await verifier.verifyTransactionHash(txHash, {
  expectedRecipient: 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6',
  expectedPrice: '0.01',
  expectedAsset: 'native',
  expectedMemo: 'challenge-nonce-123',
});

if (result.verified) {
  console.log('Payment verified on ledger', result.ledger);
}
```

### Preventing Payment Replays with `ReplayProtector`

```ts
import { ReplayProtector } from '@stellar-mcp/paywall';

const replayProtector = new ReplayProtector({
  defaultTtlSeconds: 86400, // 24 hours
});

const claimResult = await replayProtector.claim(txHash);
if (!claimResult.success) {
  throw new Error('Duplicate payment transaction hash detected');
}
```

### Generating SEP-0043 / x402 Challenges with `PaymentChallengeGenerator`

```ts
import { PaymentChallengeGenerator } from '@stellar-mcp/paywall';

const generator = new PaymentChallengeGenerator({
  network: 'stellar:testnet',
  defaultRecipient: 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6',
  defaultAsset: 'native',
  defaultValidForSeconds: 300,
});

const challenge = generator.createChallenge({
  price: '0.05',
  resource: '/api/v1/compute/predict',
});

const headers = generator.toHttpHeaders(challenge);
// Sets WWW-Authenticate, X-Payment-Challenge, X-Payment-Nonce, and X-Payment-Valid-Until
```

### Dynamic and Metered Pricing with `DynamicPricingEngine`

```ts
import { DynamicPricingEngine } from '@stellar-mcp/paywall';

// Per-token metered pricing
const pricing = new DynamicPricingEngine({
  model: 'per_token',
  basePrice: '0.001',
  pricePerToken: '0.00001',
  minPrice: '0.001',
  maxPrice: '0.050',
});

const price = await pricing.calculatePrice({ tokens: 1500 });
// Returns exact price formatted to Stellar stroop precision (e.g. "0.0160000")
```

### Web Framework Middlewares (`x402Express`, `x402Fastify`, `x402Hono`)

Protect standard HTTP API routes with x402 micro-payment negotiation:

```ts
import express from 'express';
import { x402Express } from '@stellar-mcp/paywall';

const app = express();

app.use(
  '/api/v1/analyze',
  x402Express({
    recipient: 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6',
    price: '0.05',
    asset: 'native',
  })
);

app.post('/api/v1/analyze', (req, res) => {
  // Access verified on-chain payment context
  const payment = req.x402;
  res.json({ result: 'analysis complete', payer: payment.payer });
});
```
