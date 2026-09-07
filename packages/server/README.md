# @stellar-mcp/server

Model Context Protocol (MCP) server providing autonomous AI agents with typed tools to interact with the Stellar blockchain.

## Supported Tools

| Tool | Parameters | Description |
|---|---|---|
| `stellar_get_balance` | `accountAddress`, `network` | Fetch native XLM and SAC token balances for an account |
| `stellar_get_account_details` | `accountAddress`, `network` | Inspect detailed Stellar account state including sequence number, thresholds, signer weights, flags, and balances |
| `soroban_simulate_contract` | `contractId`, `method`, `args`, `transactionXdr`, `network` | Simulate contract invocation to inspect state, CPU/memory footprint, and return values without submitting |
| `soroban_simulate_invocation` | `transactionXdr`, `contractId`, `method`, `args`, `network` | Simulate transaction envelope or contract invocation to parse CPU instructions, memory bytes, and min fee |
| `stellar_find_payment_paths` | `sourceAccount`, `destinationAccount`, `destinationAsset`, `destinationAmount`, `network` | Query Horizon for strict-receive DEX payment routes |
| `stellar_swap_tokens` | `sourceAccount`, `sendAsset`, `sendMax`, `destAsset`, `destAmount`, `destinationAccount`, `path`, `signedEnvelopeXdr`, `network` | Build optimal DEX path payment swap transaction or execute signed envelope |
| `stellar_get_orderbook` | `sellingAsset`, `buyingAsset`, `limit`, `network` | Real-time Stellar DEX orderbook bids, asks, and price spread analysis |
| `stellar_get_liquidity_pools` | `poolId`, `reserves`, `account`, `cursor`, `limit`, `order`, `network` | Query Stellar AMM liquidity pools, reserve balances, fee tiers, and total shares |
| `stellar_get_claimable_balances` | `claimant`, `sponsor`, `asset`, `balanceId`, `buildClaimEnvelope`, `cursor`, `limit`, `order`, `network` | Query and inspect claimable balances, and optionally build unsigned claim envelopes |
| `soroban_query_events` | `startLedger`, `contractIds`, `topics`, `cursor`, `limit`, `network` | Query Soroban contract event logs by contract ID, topic, and ledger range |
| `soroban_get_ledger_entries` | `keys`, `contractId`, `keySymbol`, `durability`, `network` | Read contract data and instance storage keys directly from Soroban RPC ledger state |
| `soroban_get_transaction` | `hash`, `network` | Poll and inspect Soroban transaction status, execution results, and metadata XDR |
| `soroban_get_latest_ledger` | `network` | Get the latest ledger sequence, hash, and protocol version from Soroban RPC |
| `soroban_get_network` | `network` | Get Soroban network passphrase, protocol version, and friendbot URL |
| `soroban_assemble_transaction` | `transactionXdr`, `network` | Assemble unsigned Soroban transaction envelope with simulation footprint and fees |
| `soroban_read_storage` | `contractId`, `key`, `keyType`, `userAddress`, `durability`, `network` | High-level deserializer for SAC token balances, admin keys, and storage maps |
| `stellar_submit_transaction` | `signedEnvelopeXdr`, `network` | Submit signed transaction envelope XDR to the ledger |

## Transports
- **Stdio**: Standard input/output for desktop clients like Claude Desktop and Cursor.
- **SSE**: Server-Sent Events transport for web-hosted agent orchestration frameworks.

## Installation & Usage

```bash
# Run stdio server directly via npx
npx @stellar-mcp/server --network testnet
```
