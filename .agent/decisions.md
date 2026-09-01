# Architecture Decision Records: stellar-x402-mcp

Append-only. Never rewrite an entry.

---

## ADR-001: Support Both stdio and SSE Transports

Date: 2026-09-01
Status: accepted

### Context
Local desktop clients (e.g. Claude Desktop, Cursor) connect to MCP servers via standard input/output (`stdio`). Remote cloud agents connect over HTTP using Server-Sent Events (`SSE`).

### Decision
Support both transports in `@stellar-mcp/server`, selectable via CLI flags (`--transport stdio` or `--transport sse --port 3000`).

---

## ADR-002: Pin @modelcontextprotocol/sdk at Latest Stable

Date: 2026-09-01
Status: accepted

### Context
The Model Context Protocol TypeScript SDK (`@modelcontextprotocol/sdk`) provides standard tool registration, schemas, and JSON-RPC 2.0 transport implementations.

### Decision
Pin `@modelcontextprotocol/sdk` as the standard foundation across `packages/server` and `packages/client`.

---

## ADR-003: Structured x402 Error Codes in MCP Tool Call Protocol

Date: 2026-09-01
Status: accepted

### Context
When an AI agent invokes an MCP tool that requires payment, standard MCP returns a tool execution error.

### Decision
Format the tool error response as a structured JSON object containing `error: "PAYMENT_REQUIRED"`, the CAIP-2 network identifier (`stellar:testnet`), asset address, price, and payment challenge hash so agent clients can parse and settle programmatically.

---

## ADR-004: Agent Wallet Spending Policies & Budget Caps

Date: 2026-09-01
Status: accepted

### Context
Autonomous agents with wallet signing capabilities risk draining funds if an infinite loop occurs or a rogue paywalled tool is called repeatedly.

### Decision
`@stellar-mcp/agent-client` enforces local policy checks: max spend per tool call (e.g. $0.05), max spend per session (e.g. $5.00), and a whitelist of authorized tool providers.
