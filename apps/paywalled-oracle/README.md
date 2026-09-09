# @stellar-mcp/paywalled-oracle

A standalone reference Model Context Protocol (MCP) server providing monetized financial data tools on Stellar and Soroban. Every tool is protected by `@stellar-mcp/paywall`, demanding cryptographic HTTP 402 micro-settlements in USDC or XLM.

---

## 1. Overview & Tool Inventory

The Paywalled Oracle server exposes specialized market intelligence and DeFi metrics to autonomous AI agents, LLMs, and trading bots:

| Tool Name | Pricing | Target Network | Description |
|---|---|---|---|
| `oracle_get_dex_price` | 0.01 USDC | Stellar Testnet / Pubnet | Computes bids, asks, bid/ask spread in bps, VWAP, and liquidity imbalance |
| `oracle_get_soroban_tvl` | 0.02 USDC | Soroban Testnet / Pubnet | Queries contract storage and liquidity pool reserves to calculate Total Value Locked |
| `oracle_get_swap_route` | 0.01 USDC | Stellar DEX / AMM | Discovers optimal multi-hop strict-receive paths, price impact, and fee estimation |

---

## 2. Monetization & x402 Protocol Flow

When an agent invokes any oracle tool without authorization, the server responds with a structured HTTP 402 challenge:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\"error\":\"PAYMENT_REQUIRED\",\"code\":1120,\"category\":\"PAYWALL\",\"challenge\":{\"version\":\"x402-v1\",\"network\":\"stellar:testnet\",\"asset\":\"CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC\",\"price\":\"0.01\",\"recipient\":\"GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT\",\"validUntil\":1757426400}}"
    }
  ]
}
```

The calling agent automatically signs an on-chain transaction or state channel voucher using `@stellar-mcp/agent-client`, and retries the tool invocation with `paymentSignature`.

---

## 3. Configuration & Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `ORACLE_PORT` | `4020` | Port for SSE/HTTP transport |
| `ORACLE_TRANSPORT` | `stdio` | Transport mechanism (`stdio` or `sse`) |
| `STELLAR_NETWORK` | `testnet` | Stellar network (`testnet` or `pubnet`) |
| `ORACLE_MERCHANT_ADDRESS` | `GAIA4ZKAB...` | Merchant Stellar public key receiving fees |
| `ORACLE_USDC_TOKEN` | SAC USDC address | Contract address or token identifier |
| `PRICE_DEX_PRICE` | `0.01` | Cost in USDC for DEX price queries |
| `PRICE_SOROBAN_TVL` | `0.02` | Cost in USDC for TVL queries |
| `PRICE_SWAP_ROUTE` | `0.01` | Cost in USDC for swap routing queries |

---

## 4. Running the Server

### Stdio Transport (Claude Desktop / Cursor)

```bash
# Run locally using node or tsx
pnpm --filter @stellar-mcp/paywalled-oracle start
```

Add to Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "stellar-oracle": {
      "command": "node",
      "args": ["/path/to/apps/paywalled-oracle/dist/index.js"],
      "env": {
        "ORACLE_TRANSPORT": "stdio",
        "STELLAR_NETWORK": "testnet",
        "ORACLE_MERCHANT_ADDRESS": "GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT"
      }
    }
  }
}
```

---

## 5. Development & Testing

```bash
# Run unit and integration tests
pnpm --filter @stellar-mcp/paywalled-oracle test

# Build production artifacts
pnpm --filter @stellar-mcp/paywalled-oracle build

# Run typechecks
pnpm --filter @stellar-mcp/paywalled-oracle typecheck
```
