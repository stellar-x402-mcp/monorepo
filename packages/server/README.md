# @stellar-mcp/server

Model Context Protocol (MCP) server providing autonomous AI agents with typed tools to interact with the Stellar blockchain.

## Supported Tools

| Tool | Parameters | Description |
|---|---|---|
| `stellar_get_balance` | `accountAddress`, `network` | Fetch native XLM and SAC token balances for an account |
| `soroban_simulate_contract` | `contractId`, `method`, `args`, `network` | Simulate contract invocation to inspect state and returns without submitting |
| `stellar_find_payment_paths` | `sourceAccount`, `destinationAccount`, `destinationAsset`, `destinationAmount`, `network` | Query Horizon for strict-receive DEX payment routes |
| `stellar_swap_tokens` | `sourceAccount`, `sendAsset`, `sendMax`, `destAsset`, `destAmount`, `destinationAccount`, `path`, `signedEnvelopeXdr`, `network` | Build optimal DEX path payment swap transaction or execute signed envelope |
| `soroban_query_events` | `startLedger`, `contractIds`, `topics`, `cursor`, `limit`, `network` | Query Soroban contract event logs by contract ID, topic, and ledger range |
| `soroban_get_ledger_entries` | `keys`, `contractId`, `keySymbol`, `durability`, `network` | Read contract data and instance storage keys directly from Soroban RPC ledger state |
| `stellar_submit_transaction` | `signedEnvelopeXdr`, `network` | Submit signed transaction envelope XDR to the ledger |

## Transports
- **Stdio**: Standard input/output for desktop clients like Claude Desktop and Cursor.
- **SSE**: Server-Sent Events transport for web-hosted agent orchestration frameworks.

## Installation & Usage

```bash
# Run stdio server directly via npx
npx @stellar-mcp/server --network testnet
```
