'use client';

import React, { useState } from 'react';

interface SandboxSnippet {
  id: string;
  filename: string;
  label: string;
  badge: string;
  code: string;
  terminalLogs: string[];
  outputData: Record<string, any>;
}

const SNIPPETS: SandboxSnippet[] = [
  {
    id: 'vercel',
    filename: 'agent-vercel.ts',
    label: 'Vercel AI SDK Core',
    badge: 'ai package',
    code: `import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createVercelAITools } from '@stellar-mcp/adapters/vercel';
import { X402AgentMcpClient } from '@stellar-mcp/agent-client';

// 1. Initialize client with Ed25519 signer & spending guardrails
const client = new X402AgentMcpClient({
  network: 'testnet',
  secretKey: process.env.STELLAR_AGENT_SECRET,
  maxDailyBudgetXlm: '50.0',
});

// 2. Wrap MCP tools with automated x402 payment resolution
const tools = createVercelAITools(mcpTools, client);

// 3. Execute autonomous agent reasoning loop
const { text } = await generateText({
  model: openai('gpt-4o'),
  tools,
  prompt: 'Query real-time DEX liquidity for XLM/USDC and simulate contract CDAVUN...',
});`,
    terminalLogs: [
      '[agent] Initializing X402AgentMcpClient on Stellar Testnet (Protocol 22)',
      '[agent] Budget policy active: maxDailyBudget = 50.0 XLM, singleCallCap = 5.0 XLM',
      '[ai] Agent selected tool: stellar_get_orderbook (selling: native, buying: USDC)',
      '[x402] Tool returned HTTP 402: Payment Required (Code: 1120)',
      '[x402] Challenge received: Nonce #94102 | Recipient: GCQURZ...WD4T | Amount: 0.05 XLM',
      '[wallet] InMemoryWalletSigner signed transaction envelope (TxHash: 55324f...935)',
      '[settlement] OnChainTransactionVerifier confirmed ledger sequence #1048301',
      '[agent] HTTP 402 challenge resolved. Tool executed in 1.4s.'
    ],
    outputData: {
      tool: 'stellar_get_orderbook',
      pair: 'XLM / USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      bestBid: '0.1245000',
      bestAsk: '0.1248000',
      spreadBps: 24.1,
      settlementMode: 'native_xlm_settled',
      transactionHash: '55324f4c7277b8596452723f894fce3061a019e7cf98d080f2dfea65f5144935'
    }
  },
  {
    id: 'client',
    filename: 'agent-client.ts',
    label: 'Autonomous Agent Client',
    badge: '@stellar-mcp/agent-client',
    code: `import { X402AgentMcpClient } from '@stellar-mcp/agent-client';

const client = new X402AgentMcpClient({
  network: 'testnet',
  secretKey: process.env.STELLAR_SECRET_KEY,
  circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 30000 },
});

// Call paywalled oracle tool; client transparently handles:
// 1. HTTP 402 challenge interception
// 2. Budget verification (Error 1190/1192 protection)
// 3. Ed25519 signing & hash-level idempotency
// 4. Automatic retry with payment receipt header
const response = await client.callPaywalledTool('oracle_get_dex_price', {
  baseAsset: 'XLM',
  quoteAsset: 'USDC',
});

console.log('Verified Price Feed:', response.data);`,
    terminalLogs: [
      '[client] Connecting to MCP Server endpoint via stdio/SSE',
      '[client] Calling paywalled tool: oracle_get_dex_price',
      '[transport] Received HTTP 402 Payment Required',
      '[circuit-breaker] Health: CLOSED (0 failures in rolling 60s window)',
      '[budget] Budget check: current daily spend 0.12 / 50.0 XLM. Approved.',
      '[crypto] Ed25519 signature generated in memory. Zero key leakage.',
      '[settlement] Broadcasted Soroban SAC transfer to Horizon RPC',
      '[client] Payment settled. Received authoritative oracle data.'
    ],
    outputData: {
      pair: 'XLM/USDC',
      price: '0.12465',
      sources: ['DEX Orderbook', 'Liquidity Pool #284a'],
      timestamp: 1725883410,
      settledInLedger: 1048305
    }
  },
  {
    id: 'paywall',
    filename: 'paywalled-server.ts',
    label: 'HTTP 402 Paywalled Tool',
    badge: '@stellar-mcp/paywall',
    code: `import { x402Tool } from '@stellar-mcp/paywall';
import { OnChainTransactionVerifier, ReplayProtector } from '@stellar-mcp/paywall';

// Protect any MCP tool with cryptographic micro-payment challenge
export class StellarOracleServer {
  @x402Tool({
    price: '0.0100000',
    asset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    recipient: process.env.MERCHANT_STELLAR_ADDRESS!,
    network: 'testnet',
  })
  async oracle_get_soroban_tvl(args: { contractId: string }) {
    // Business logic runs ONLY after verified on-chain payment
    return { tvlUsd: '4,285,120.50', activeChannels: 142 };
  }
}`,
    terminalLogs: [
      '[server] Registering tool: oracle_get_soroban_tvl with @x402Tool guard',
      '[paywall] Rule active: 0.0100000 USDC per execution',
      '[paywall] Incoming request without payment header. Trapping.',
      '[paywall] Emitted SEP-0043 challenge (nonce: 8c3b...4a12, code: 1120)',
      '[paywall] Second request arrived with X-Payment-Proof envelope',
      '[verifier] Horizon verification: sender balance & recipient validated',
      '[replay] ReplayProtector claimed hash 7f20...119a. Cache updated.',
      '[server] Executing inner handler and returning payload.'
    ],
    outputData: {
      contractId: 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY',
      tvlUsd: '4,285,120.50',
      activeChannels: 142,
      protocolVersion: 22,
      verifiedLedger: 1048309
    }
  }
];

export function LiveCodeSandbox() {
  const [activeTab, setActiveTab] = useState(SNIPPETS[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentSnippet = SNIPPETS.find((s) => s.id === activeTab) || SNIPPETS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRun = () => {
    setIsRunning(true);
    setShowOutput(false);
    setTimeout(() => {
      setIsRunning(false);
      setShowOutput(true);
    }, 1200);
  };

  return (
    <section style={{ marginTop: 56, marginBottom: 56 }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--accent-blue)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 6
        }}>
          <span>Interactive Sandbox</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Developer Integration & Execution Sandbox
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Zero glue-code adapters for leading AI agent frameworks with automated HTTP 402 payment settlement.
        </p>
      </div>

      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        {/* Top Tab Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: '#0d1117',
          flexWrap: 'wrap',
          gap: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
            {SNIPPETS.map((snippet) => {
              const isSelected = snippet.id === activeTab;
              return (
                <button
                  key={snippet.id}
                  onClick={() => {
                    setActiveTab(snippet.id);
                    setShowOutput(false);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isSelected ? 'var(--bg-card)' : 'transparent',
                    border: isSelected ? '1px solid var(--border)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{snippet.filename}</span>
                  <span style={{
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 10,
                    backgroundColor: isSelected ? 'rgba(47, 129, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)'
                  }}>
                    {snippet.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleCopy}
              style={{
                padding: '5px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>

            <button
              onClick={handleRun}
              disabled={isRunning}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                color: '#ffffff',
                backgroundColor: isRunning ? '#1f6feb' : 'var(--accent-green)',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                cursor: isRunning ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background-color 0.15s ease'
              }}
            >
              {isRunning ? 'Simulating...' : '▶ Run Sandbox'}
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div style={{ padding: 20, backgroundColor: '#0d1117', overflowX: 'auto' }}>
          <pre style={{
            margin: 0,
            fontSize: 13,
            lineHeight: 1.65,
            color: '#c9d1d9',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace'
          }}>
            <code>{currentSnippet.code}</code>
          </pre>
        </div>

        {/* Live Execution Output Terminal */}
        {(isRunning || showOutput) && (
          <div style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: '#07090e',
            padding: 18
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isRunning ? '#d29922' : '#3fb950',
                  display: 'inline-block'
                }}></span>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {isRunning ? 'Connecting to Stellar Testnet RPC...' : 'Execution Output (Protocol 22)'}
                </span>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Ledger Latency: 1.4s • CPU: 0 (State Channel)
              </span>
            </div>

            {isRunning ? (
              <div style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
                Simulating autonomous agent micro-settlement against Stellar Testnet...
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Agent Execution Logs
                  </div>
                  <div style={{
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#8b949e',
                    lineHeight: 1.6
                  }}>
                    {currentSnippet.terminalLogs.map((log, index) => (
                      <div key={index} style={{
                        color: log.includes('x402') ? '#79c0ff' : log.includes('resolved') ? '#7ee787' : '#8b949e'
                      }}>
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                    Returned Tool Output
                  </div>
                  <div style={{
                    backgroundColor: '#0d1117',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 12,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    color: '#7ee787',
                    overflowX: 'auto',
                    lineHeight: 1.5
                  }}>
                    <pre style={{ margin: 0 }}>
                      {JSON.stringify(currentSnippet.outputData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
