## Description

<!-- Provide an institutional summary of the changes proposed in this pull request. -->
<!-- Explain the architectural problem solved, rationale for decisions, and system impact. -->

---

## Type of Change

- [ ] `feat`: New MCP tool, payment settlement modality, or core protocol capability
- [ ] `fix`: Defect remediation mapped to a specific Universal 250 Error Code
- [ ] `perf`: Gas optimization, CPU instruction reduction, or WASM size reduction
- [ ] `refactor`: Architectural refactoring without functional changes
- [ ] `docs`: Documentation updates, GitBook sync, or architectural decision records
- [ ] `test`: Unit, integration, stress, or benchmark test suite additions

---

## Related Issue / Error Code Mapping

- **GitHub Issue**: Closes #
- **Universal 250 Error Code**:
  - Code: 
  - Slug: 
  - Category: 
  - Retryable: [ ] Yes / [ ] No
  - Remedy: 

---

## Affected Workspaces & Components

- [ ] `packages/server` (@stellar-mcp/server: 17+ Horizon and Soroban MCP tools)
- [ ] `packages/paywall` (@stellar-mcp/paywall: HTTP 402 engine, verifiers, replay protection)
- [ ] `packages/client` (@stellar-mcp/agent-client: autonomous wallet, 7 payment rails)
- [ ] `packages/adapters` (@stellar-mcp/adapters: Vercel AI SDK, LangChain, LlamaIndex)
- [ ] `packages/cli` (@stellar-mcp/cli: binary runtime, key management, gas inspection)
- [ ] `contracts/x402_channel` (Soroban State Channel smart contract)
- [ ] `apps/showcase` (Next.js interactive web showcase and simulator)
- [ ] `apps/paywalled-oracle` (Reference MCP paid oracle server)
- [ ] `apps/trading-agent` (Reference autonomous trading agent)
- [ ] `.github/workflows` (CI/CD pipeline and release automation)

---

## Security & Cryptography Invariants

- [ ] **Zero Private Key Leakage**: Secret keys remain strictly inside `InMemoryWalletSigner` and are omitted from logs, error payloads, and JSON serialization.
- [ ] **Replay Protection**: Nonce verification and envelope hash memo tracking enforced via `ReplayProtector` with deterministic TTL expiration.
- [ ] **Cryptographic Verification**: On-chain verification checks transaction status, source account, destination account, asset code, and amount against Horizon and Soroban RPC.
- [ ] **Input Sanitization**: All tool arguments validated against Zod schemas; contract arguments checked against strict ScVal schemas.

---

## Resilience & Production Quality Checklist

- [ ] **Circuit Breaker**: Fast-fails with zero outbound network calls during upstream RPC outages.
- [ ] **Jittered Exponential Backoff**: Prevents thundering herd hazards on rate-limited endpoints.
- [ ] **Finality Polling**: Enforces terminal `SUCCESS` or `FAILED` states, rejecting intermediate `PENDING` states.
- [ ] **Idempotency Anchoring**: Payment deduplication anchored on envelope hash to prevent double settlement.
- [ ] **Budget Guardrails**: Per-call cap and rolling 24-hour spending caps validated.

---

## Soroban Smart Contract & Gas Benchmarks (if contract modified)

- [ ] **WASM Binary Size**: Optimized under 6KB target using spec-shaking v2 and LTO.
- [ ] **CPU Instructions**: Profiled and recorded in `BENCHMARKS.md`.
- [ ] **Memory Footprint**: Measured within limits.
- [ ] **Storage Rent**: Persistent and temporary storage entries bounded to minimize rent liability.

---

## Documentation Parity

- [ ] Official GitBook documentation updated at `https://emeditweb.gitbook.io/x402`.
- [ ] `SUMMARY.md` navigation tree updated if new guides or tools were added.
- [ ] Code examples verified against current package APIs.

---

## Verification & Test Evidence

- [ ] `pnpm build`: Clean compilation across all packages with dual ESM/CJS outputs.
- [ ] `pnpm typecheck`: Strict TypeScript check with zero errors (`exactOptionalPropertyTypes: true`).
- [ ] `pnpm test:all`: Full unit, app, and E2E test suite passing (155 tests, 100% pass rate).
- [ ] `cargo test --manifest-path contracts/x402_channel/Cargo.toml`: Smart contract tests and benchmarks passing.
