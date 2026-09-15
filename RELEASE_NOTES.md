# Stellar x402 MCP Monorepo v0.1.0: Production Testnet Release

Initial official release of the Stellar x402 Model Context Protocol (MCP) monorepo. This release marks the completion of Milestones 1 through 17, providing an institutional-grade autonomous AI agent settlement infrastructure on Stellar Horizon and Soroban.

---

## 1. Executive Summary

The Stellar x402 Model Context Protocol (MCP) platform enables autonomous AI agents (running in Claude Desktop, Cursor, LangChain, Vercel AI SDK Core, or LlamaIndex) to autonomously negotiate, price, sign, and settle micro-transactions on the Stellar network.

By implementing the HTTP 402 Payment Required standard natively over standard I/O (stdio) and remote Server-Sent Events (SSE) transports, agents can programmatically consume paywalled APIs, oracle data feeds, and on-chain services with zero human intervention.

---

## 2. Core Protocol Capabilities

### A. 17+ Model Context Protocol Tools
- **Horizon Account & Asset Inspection**: Query native balances, SAC trustlines, payment history, and path payment discovery.
- **Stellar DEX & AMM Analytics**: Orderbook depth inspection, liquidity pool metrics, and multi-hop swap route estimation.
- **Soroban Smart Contract Operations**: Contract invocation, state simulation, and real-time gas/storage rent estimation.
- **Dual Transports**:
  - `stdio`: Low-latency local process communication for IDEs and CLI agents.
  - `sse`: Remote HTTP/SSE server with session tracking, CORS preflight handling, and health checking (`/health`).
- **Remote Authentication**: Strict `Authorization: Bearer <token>` enforcement, rejecting unauthorized connections with HTTP 401 and protocol error code 1000.

### B. Multi-Rail & Off-Chain Settlement Engine
- **Native XLM Settlement**: Automated transaction construction, memo hash tracking, and fee-bump envelope wrapping.
- **Soroban SAC Tokens**: USDC and custom asset settlement with on-chain cryptographic nonce verification and allowance tracking.
- **Off-Chain State Channels**: Monotonic micro-vouchers enabling zero-gas, sub-millisecond payment settlement with dispute timeouts.

### C. Soroban State Channel Smart Contract (`x402_channel`)
- Deployed on Stellar Testnet: `CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY`
- Deployment Transaction: `55324f4c7277b8596452723f894fce3061a019e7cf98d080f2dfea65f5144935`
- WASM Bytecode Hash: `dcf795a2daff9472f0796ca0188e4f5cae0c868a68cd70dc755557708b4efdb3`
- Comprehensive 11-suite test coverage covering all `ChannelError` variants:
  - `InvalidDeposit`: Rejects zero or negative funding amounts.
  - `ChannelExpired`: Prevents opening channels at or past current ledger sequence.
  - `InvalidNonce`: Enforces strictly increasing nonces to defeat replay attacks.
  - `InvalidAmount`: Rejects zero/negative claims, underclaims, or overclaims exceeding deposit.
  - `ChannelNotExpired` and `Unauthorized`: Blocks unauthorized third parties and enforces lockup periods.
  - `ChannelClosed`: Rejects duplicate settlements on closed channels.
  - `ChannelNotFound`: Safely handles queries on uninitialized channels.
- **Generative Property-Based Invariant Fuzzing**: 50-step micro-voucher simulation asserting state integrity and strict token balance conservation (`contract_balance + merchant_balance == initial_deposit`) with zero dust.

---

## 3. Enterprise Hardening & Custody

- **Enterprise Key Custody (`CustomAgentSigner`)**:
  - Asynchronous signature delegation hook (`(payload: Buffer) => Promise<Buffer>`) for AWS KMS, GCP Cloud KMS, and HashiCorp Vault.
  - Automatic `[DELEGATED_KMS_SECURE]` credential masking prevents secret leakage in logs.
- **Distributed Cluster Anti-Replay (`RedisReplayStorageAdapter`)**:
  - High-throughput atomic key management (`SET ... EX`) for horizontal multi-instance scaling behind load balancers.
- **Agent Policy Guardrails**:
  - `BudgetTracker` with rolling 24-hour daily limits and per-call spending caps.
  - Jittered exponential backoff and circuit breaker protection against RPC outages.

---

## 4. Agent Framework Adapters

- **Vercel AI SDK Core (`ai`)**: `createVercelAITool` / `createVercelAITools` with Zod schema mapping for `generateText` and `streamText`.
- **LangChain Core (`@langchain/core`)**: `StellarMCPLangChainTool` instances with structured tool execution and automated 402 challenge negotiation.
- **LlamaIndex**: `StellarMCPLlamaTool` and `createLlamaIndexTools` for autonomous ReAct agent loops.

---

## 5. Universal 250 Error Codes Registry

- 100% error classification coverage across 7 protocol domains (Codes 1000 to 1700).
- Standardized fields: `code`, `slug`, `category`, `retryable`, `reason`, and `remedy`.

---

## 6. Standalone Reference Applications

- **`apps/paywalled-oracle`**: Production MCP server exposing paid DEX pricing (`oracle_get_dex_price`), TVL analytics (`oracle_get_soroban_tvl`), and optimal routing signals (`oracle_get_swap_route`).
- **`apps/trading-agent`**: Production autonomous agent trading loop that consumes paywalled market intelligence, evaluates arbitrage spreads, and executes trades with budget guardrails.
- **`apps/showcase`**: Full-stack Next.js interactive web application demonstrating the protocol, live code runner, and error directory.

---

## 7. Test Coverage & Verification

- **TypeScript Monorepo**: 163 passing unit, integration, and E2E stress tests (100% pass rate).
- **Soroban Rust Contract**: 11 passing unit and generative fuzzing tests (100% pass rate).
- **CI / CD**: Multi-node matrix on Node 22 and Node 24 on `ubuntu-latest`.

---

## 8. Release Assets & Checksums

| Filename | Type | Size |
|---|---|---|
| `x402_channel.wasm` | Optimized Soroban Smart Contract Bytecode | 12.46 KiB |
| `stellar-mcp-cli-0.1.0.tgz` | Standalone CLI Distribution Tarball | 18.97 KiB |
| `SHA256SUMS.txt` | Cryptographic Checksums | 176 B |
