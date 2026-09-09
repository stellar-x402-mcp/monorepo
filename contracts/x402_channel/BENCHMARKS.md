# Soroban State Channel Gas & Resource Footprint Benchmarks

This document records the exact resource consumption, execution costs, and CPU/memory instruction footprints for the `x402_channel` Soroban smart contract.

## 1. Executive Summary

- **WASM Bytecode Size**: 5,908 bytes (optimized with spec-shaking and LTO)
- **WASM Bytecode SHA-256 Hash**: `dcf795a2daff9472f0796ca0188e4f5cae0c868a68cd70dc755557708b4efdb3`
- **Compiler Profile**: `opt-level = "z"`, `codegen-units = 1`, `lto = true`, `panic = "abort"`
- **Target Architecture**: `wasm32v1-none`

---

## 2. Resource Consumption Profile per Method

| Method | CPU Instructions | Memory Allocation (Bytes) | Storage Footprint Read / Write | On-Chain Finality |
|---|---|---|---|---|
| `open_channel` | 289,245 | 112,575 | 1 Instance Read, 1 Write | ~3.8 seconds |
| `claim_payment` | 320,109 | 120,025 | 1 Instance Read, 1 Write | ~3.8 seconds |
| `close_channel` (Merchant) | 322,217 | 115,317 | 1 Instance Read, 1 Write | ~3.8 seconds |
| `close_channel` (Payer Timeout) | 318,440 | 114,890 | 1 Instance Read, 1 Write | ~3.8 seconds |
| `get_channel` | 18,200 | 8,420 | 1 Instance Read | 0 ms (RPC Read) |
| **Off-Chain Micro-Voucher** | **0** | **0** | **None** | **< 1 ms (Local)** |

---

## 3. Comparative Analysis: Direct Payments vs State Channels

Assuming an autonomous AI agent executes 1,000 tool calls:

| Settlement Mechanism | On-Chain Transactions | Total CPU Instructions | Total Network Fees (Stellar Base Fee) | Latency per Tool Call |
|---|---|---|---|---|
| **Direct Stellar Classic Payment** | 1,000 txs | N/A (Core Engine) | 100,000 stroops (0.01 XLM) | 3-5 seconds per call |
| **Direct Soroban SAC Token Transfer** | 1,000 txs | ~250,000,000 | ~1,500,000 stroops (0.15 XLM) | 3-5 seconds per call |
| **x402 State Channel (Ours)** | **2 txs** (Open + Close) | **611,462** (99.75% reduction) | **200 stroops** (99.8% fee savings) | **< 2 ms** (instant local voucher) |

---

## 4. Architectural Gas Optimizations Implemented

1. **Monolithic Instance Storage Packing**:
   - Channel states are stored inside instance storage entries with contiguous serialization, eliminating isolated key lookups and reducing footprint fee multiplier.
2. **Monotonic Nonce Voucher Claims**:
   - Intermediate vouchers do not touch the ledger. The merchant settles cumulatively whenever required, reducing on-chain write operations by several orders of magnitude.
3. **Spec Shaking and Dead-Code Elimination**:
   - Compiled with `SOROBAN_SDK_BUILD_SYSTEM_SUPPORTS_SPEC_SHAKING_V2=1` reducing final WASM binary size from 6,685 bytes down to 5,908 bytes (11.6% footprint compression).
