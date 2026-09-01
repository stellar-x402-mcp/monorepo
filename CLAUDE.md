# CLAUDE.md: stellar-x402-mcp

**Project**: `stellar-x402-mcp`
**Role**: Stellar Model Context Protocol (MCP) server & @x402Paywall agent monetization framework
**Current Phase**: Phase 7 (MCP Server & Tooling Implementation)

## Non-Negotiables
- Node 22 LTS, pnpm 11, TypeScript 5.9.2 (`strict: true`)
- `@modelcontextprotocol/sdk`: latest stable
- `@stellar/stellar-sdk`: 16.2.0 pinned
- Wallet keys isolated in memory, never exposed via tool parameters or logs

## Authoritative Documentation
- System Prompt: `docs/planning/system-prompt.md`
- Context & Tool Index: `.agent/context.md`
- Decision Log: `.agent/decisions.md`
