# @stellar-mcp/paywall

Decorator, verifier, and middleware framework to monetize custom Model Context Protocol (MCP) tools using HTTP 402 paywalls settled on Stellar.

## Features
- `@x402Tool`: Higher-order decorator intercepting unpaid MCP tool calls with structured 402 challenge errors.
- `OnChainTransactionVerifier`: Cryptographic and on-chain payment verification engine validating transaction hashes and signed envelopes against Horizon and Soroban RPC.
- `ReplayProtector`: In-memory and cache-backed storage preventing duplicate submission of the same transaction hash with TTL expiration and LRU eviction.

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
