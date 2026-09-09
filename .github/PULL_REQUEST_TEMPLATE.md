## Description

<!-- Provide a detailed summary of the architectural changes and problem solved. -->

## Affected Components

- [ ] `packages/server` (@stellar-mcp/server)
- [ ] `packages/paywall` (@stellar-mcp/paywall)
- [ ] `packages/client` (@stellar-mcp/agent-client)
- [ ] `contracts/x402_channel` (Soroban State Channel)
- [ ] `apps/showcase` (Interactive Web Portal)
- [ ] `.github/workflows` (CI/CD Pipeline)

## 250 Error Codes Mapping

<!-- Which error code(s) from the 250 registry are added or handled in this PR? -->
- Code: 
- Slug: 
- Category: 
- Retryable: [ ] Yes / [ ] No

## Security & Resilience Checks (IndigoPay Standard)

- [ ] Zero Private Key Leakage: Secrets held exclusively in memory; omitted from logs and JSON serialization.
- [ ] Hash-Level Idempotency: All payment transactions anchored on envelope hash.
- [ ] Circuit Breaker: Fail-fast implemented for transient upstream RPC outages.
- [ ] Finality Polling: Terminal SUCCESS / FAILED enforced; intermediate PENDING rejected.
- [ ] exactOptionalPropertyTypes: Conforms to strict base tsconfig without implicit undefines.

## Gas & Performance Impact

- [ ] CPU instruction footprint measured and within budget.
- [ ] Storage read/write footprint minimized to prevent ledger rent inflation.
- [ ] Spec-shaking and WASM optimization verified (under 10KB target).

## Verification Checklist

- [ ] `pnpm test` (all packages passing)
- [ ] `pnpm typecheck` (tsc --noEmit with zero errors)
- [ ] `pnpm build` (clean ESM, CJS, and DTS output)
- [ ] `cargo test` (Soroban smart contract unit tests and benchmarks passing)
