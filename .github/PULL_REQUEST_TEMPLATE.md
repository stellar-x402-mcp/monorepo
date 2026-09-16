<!--
  STELLAR X402 MODEL CONTEXT PROTOCOL (MCP) PULL REQUEST TEMPLATE
  
  Please complete all sections below. This repository enforces institutional-grade
  rigour for all changes touching the agent settlement protocol, payment paths,
  Soroban smart contracts, and agent framework adapters.
  
  Delete placeholder guidance comments before submitting.
-->

Closes #<!-- ISSUE NUMBER -->

> ## Status: [COMPLETE / IN PROGRESS] : All Workstreams Satisfied
> 
> - **Primary Workstream**: [e.g. Soroban state channel dispute resolution, KMS signing delegate, etc.]
> - **Associated Workstreams**: [List any accompanying workstreams audited or touched]
> - **CI Status**: All required checks passing (`Build & Test (Node 22)`, `Build & Test (Node 24)`, `Soroban Smart Contract Tests & Benchmarks`)

---

## 1. Executive Summary

<!--
  Provide a high-level summary of the changes in this pull request.
  Highlight the primary architectural problem solved and the unifying invariant enforced.
  Example: "Every on-chain write is submitted through one hardened pipeline that retries
  only transient failures, enforces terminal finality polling, and records audit metrics."
-->

**The unifying property this PR enforces:** *<!-- State the exact core invariant enforced by this PR -->*

---

## 2. Background: Problem Statement & Money-Path Context

<!--
  Explain why this change is necessary. Describe the previous behavior, edge cases,
  or vulnerabilities that existed prior to this PR. Use the Before vs After table below.
-->

| Component / Caller | Entry Point (Before) | Failure Mode / Limitation | Resolution in this PR |
|---|---|---|---|
| `<!-- e.g. packages/paywall -->` | `<!-- previous method -->` | `<!-- describe previous failure mode -->` | `<!-- describe fix -->` |
| `<!-- e.g. contracts/x402_channel -->` | `<!-- previous method -->` | `<!-- describe previous failure mode -->` | `<!-- describe fix -->` |

---

## 3. Workstream Audit & Scope Verification

<!--
  If this PR addresses a multi-part milestone or epic, audit all workstreams here.
  Confirm which parts are implemented in this PR and verify whether other parts are already present.
-->

| # | Workstream | Acceptance Criteria | Status in Repo | Action in this PR |
|---|---|---|---|---|
| **W1** | `<!-- e.g. Payment Pipeline -->` | `<!-- e.g. Monotonic voucher nonces -->` | `<!-- Gap / Present on main -->` | `<!-- Implemented end-to-end -->` |
| **W2** | `<!-- e.g. Replay Protection -->` | `<!-- e.g. Redis atomic TTL keys -->` | `<!-- Present on main -->` | `<!-- Verified present -->` |
| **W3** | `<!-- e.g. Error Registry -->` | `<!-- e.g. Universal 250 code mapping -->` | `<!-- Present on main -->` | `<!-- Verified present -->` |

---

## 4. Technical Architecture & System Flow

### 4.1 Flow Diagram

```
<!-- Provide an ASCII or text architecture diagram illustrating the execution flow -->
               Agent Request (HTTP 402 Negotiation)
                               │
                               ▼
               ┌───────────────────────────────┐
               │    X402 Payment Challenge     │
               └───────────────────────────────┘
                               │
                Token / Rail Supported?
                 ├─ Native XLM  ──────▶ Build Payment & Submit
                 ├─ Soroban SAC ──────▶ Build SAC Transfer & Submit
                 └─ State Channel ────▶ Sign Micro-Voucher Nonce
                               │
                               ▼
               ┌───────────────────────────────┐
               │     On-Chain Verification     │
               │   (Finality & Anti-Replay)    │
               └───────────────────────────────┘
```

### 4.2 Core Protocol Guarantees

1. **Error Classification & Bounded Retries**: Retries only transient network or HTTP 5xx failures with jittered exponential backoff. Deterministic 4xx rejections fail immediately.
2. **Circuit Breaker Fail-Fast**: Breaker trips after consecutive threshold failures and fails fast with zero network calls during cooldown.
3. **Terminal Finality Polling**: Pending transactions are polled until confirmed on a ledger or definitively rejected.
4. **Idempotency & Anti-Replay**: Deduplication anchored on envelope hash and cryptographic nonce with atomic TTL expiration.
5. **Balance & Gas Conservation**: Strict balance conservation across contract escrow and participants with zero residual dust.

### 4.3 Universal 250 Error Codes Mapping

<!-- Every error path must be mapped to a deterministic Universal 250 Error Code -->

| Error Code | Error Slug | Category | Retryable | Operator / Caller Action |
|---|---|---|---|---|
| `<!-- e.g. 1000 -->` | `<!-- ERR_NETWORK_CIRCUIT_OPEN -->` | `Protocol` | `No (fail-fast)` | `<!-- action -->` |
| `<!-- e.g. 1160 -->` | `<!-- ERR_REPLAY_TX_HASH_CLAIMED -->` | `Settlement` | `Never` | `<!-- action -->` |

---

## 5. Detailed Changes, File by File

<!-- Group changes logically by package or workspace layer -->

### `packages/<!-- package-name -->`
- `path/to/file.ts`:
  - Detail 1
  - Detail 2

### `contracts/x402_channel` (if smart contract modified)
- `src/lib.rs`:
  - Detail 1
- `src/test.rs`:
  - Detail 1

---

## 6. Failure-Mode Analysis & Operator Observability

<!-- Detail what operators and monitoring systems will observe when failures occur -->

| Failure Scenario | Upstream Error | Circuit / Policy Action | Log & Metric Signature | Recovery Behavior |
|---|---|---|---|---|
| RPC Outage | `ECONNRESET` / `503` | Breaker opens after 3 trips | `status: CIRCUIT_OPEN` | Cooldown elapses, half-opens, self-heals |
| Replay Attack | Stale Nonce | Immediate rejection | `code: 1160 (REPLAY_CLAIMED)` | Fail-closed, zero funds disbursed |
| Budget Exceeded | Spending Cap Hit | Immediate rejection | `code: 1190 (BUDGET_EXCEEDED)` | Agent halts settlement, alerts operator |

---

## 7. Verification & Test Evidence

<!-- Provide exact command lines and output results demonstrating 100% test pass rate -->

### 7.1 Test Suites Executed

| Test Level | Scope | Command | Results |
|---|---|---|---|
| Unit Tests | Monorepo Packages | `pnpm test` | Passed (100%) |
| Smart Contract | Rust Unit & Fuzzing | `cargo test --manifest-path contracts/x402_channel/Cargo.toml` | 11 passed (100%) |
| End-to-End | Stress & Coordination | `pnpm test:e2e` | Passed (100%) |
| Full Workspace | Comprehensive Suite | `pnpm test:all` | 163 passed (100%) |

### 7.2 Benchmark & Resource Consumption (if smart contract modified)

- **WASM Size**: `12.46 KiB` (Target: < 15 KiB)
- **CPU Instructions**: `open_channel`: 180,420 | `claim_payment`: 145,210 | `close_channel`: 162,390
- **Memory Footprint**: `open_channel`: 8,920 bytes | `claim_payment`: 7,140 bytes | `close_channel`: 8,110 bytes

---

## 8. Configuration Reference

<!-- Document any new or modified environment variables, CLI flags, or config parameters -->

| Variable / Flag | Default | Allowed Values | Description & Safety Bounds |
|---|---|---|---|
| `STELLAR_NETWORK` | `testnet` | `testnet`, `mainnet` | Target Stellar network environment |
| `RPC_URL` | Horizon / RPC testnet | Valid HTTPS URI | Primary RPC node connection |
| `MAX_DAILY_BUDGET` | `100.0` | Positive float | Rolling 24-hour spending cap per agent |
| `CIRCUIT_FAILURE_THRESHOLD` | `3` | Positive integer | Consecutive failures before opening breaker |

---

## 9. Security, Invariants & Compatibility Considerations

- [ ] **Zero Private Key Leakage**: Secret keys remain inside secure memory/KMS and are omitted from logs, error payloads, and JSON output (`[DELEGATED_KMS_SECURE]`).
- [ ] **Monotonic Sequence Enforcement**: Voucher nonces strictly increase; equal, stale, or zero nonces are rejected.
- [ ] **Balance Conservation Invariant**: Contract escrow balance plus total payouts equals initial deposit with zero residual dust.
- [ ] **No Breaking API Changes**: Existing public interfaces preserve backwards compatibility.
- [ ] **Fail-Closed Semantics**: Unrecognized transaction statuses or unverified signatures produce terminal errors rather than optimistic completion.

---

## 10. Files Changed Summary

| File Path | Component | Changes Description | Additions | Deletions |
|---|---|---|---|---|
| `path/to/file1` | `<!-- component -->` | `<!-- summary of change -->` | `+X` | `-Y` |
| `path/to/file2` | `<!-- component -->` | `<!-- summary of change -->` | `+A` | `-B` |

---

## 11. Rollout, Deployment & Operations Note

<!--
  Provide operational guidance: database migrations, contract deployments,
  alert thresholds, or operational steps needed when deploying this PR.
-->

- **Deployment Impact**: Zero breaking changes. Additive features and bug fixes.
- **Contract Migration**: Not required / Contract address: `CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY`.
- **Operator Monitoring**: Configure alerting on metric `stellar:circuit_breaker:open` and Universal Error Code frequency spikes.

