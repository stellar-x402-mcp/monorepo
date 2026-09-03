# @stellar-mcp/server

Model Context Protocol (MCP) server providing autonomous AI agents with typed tools to interact with the Stellar blockchain.

## Supported Tools

| Tool | Parameters | Description |
|---|---|---|
| `stellar_get_balance` | `accountAddress`, `network` | Fetch native XLM and SAC token balances for an account |
| `soroban_simulate_contract` | `contractId`, `method`, `args`, `network` | Simulate contract invocation to inspect state and returns without submitting |
| `stellar_find_payment_paths` | `sourceAccount`, `destinationAccount`, `destinationAsset`, `destinationAmount`, `network` | Query Horizon for strict-receive DEX payment routes |
| `stellar_submit_transaction` | `signedEnvelopeXdr`, `network` | Submit signed transaction envelope XDR to the ledger |

## Transports
- **Stdio**: Standard input/output for desktop clients like Claude Desktop and Cursor.
- **SSE**: Server-Sent Events transport for web-hosted agent orchestration frameworks.

## Installation & Usage

```bash
# Run stdio server directly via npx
npx @stellar-mcp/server --network testnet
```
