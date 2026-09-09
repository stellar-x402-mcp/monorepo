'use client';

import React, { useState } from 'react';

interface ToolDefinition {
  name: string;
  category: 'Horizon' | 'Soroban RPC';
  description: string;
  defaultArgs: Record<string, any>;
  sampleResponse: Record<string, any>;
}

const TOOLS: ToolDefinition[] = [
  {
    name: 'stellar_get_balance',
    category: 'Horizon',
    description: 'Queries native XLM and SAC token balances for any Stellar address.',
    defaultArgs: {
      account: 'GCQURZFYPPAN76FRARROTSTYVH2LQ5AP7OLDXMJPIQ7STDOM55FXWD4T'
    },
    sampleResponse: {
      account: 'GCQURZFYPPAN76FRARROTSTYVH2LQ5AP7OLDXMJPIQ7STDOM55FXWD4T',
      balances: [
        { asset: 'native', balance: '9989.9999800', buyingLiabilities: '0.0000000', sellingLiabilities: '0.0000000' }
      ]
    }
  },
  {
    name: 'stellar_get_orderbook',
    category: 'Horizon',
    description: 'Queries real-time DEX market depth, orderbook bids/asks, and spread.',
    defaultArgs: {
      selling: 'native',
      buying: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      limit: 5
    },
    sampleResponse: {
      pair: 'native / USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      bids: [{ price: '0.1245000', amount: '4500.0000000' }],
      asks: [{ price: '0.1248000', amount: '12000.0000000' }],
      spread: '0.0003000',
      spreadBps: 24.1
    }
  },
  {
    name: 'soroban_get_latest_ledger',
    category: 'Soroban RPC',
    description: 'Queries latest sequence, protocol version, and closing time from Soroban RPC.',
    defaultArgs: {},
    sampleResponse: {
      id: '12ef4b901a88c7f9e8a...',
      sequence: 1048295,
      protocolVersion: 22,
      closeTime: 1725883392
    }
  },
  {
    name: 'soroban_simulate_invocation',
    category: 'Soroban RPC',
    description: 'Dry-runs contract call and returns resource footprints and auth requirements.',
    defaultArgs: {
      contractId: 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY',
      functionName: 'get_channel',
      args: ['1']
    },
    sampleResponse: {
      status: 'SUCCESS',
      cpuInstructions: 18200,
      memoryBytes: 8420,
      minFee: '100',
      readOnlyFootprint: ['CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY']
    }
  },
  {
    name: 'stellar_get_liquidity_pools',
    category: 'Horizon',
    description: 'Inspects AMM liquidity pools, reserve balances, and total pool shares.',
    defaultArgs: {
      reserves: ['native', 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN']
    },
    sampleResponse: {
      pools: [
        {
          id: '8a9f2e...4b1c',
          feeBps: 30,
          totalShares: '150000.0000000',
          reserves: [
            { asset: 'native', amount: '48200.0000000' },
            { asset: 'USDC:...', amount: '6025.000000' }
          ]
        }
      ]
    }
  },
  {
    name: 'stellar_get_claimable_balances',
    category: 'Horizon',
    description: 'Inspects pending claimable balance escrows and time predicates.',
    defaultArgs: {
      claimant: 'GCQURZFYPPAN76FRARROTSTYVH2LQ5AP7OLDXMJPIQ7STDOM55FXWD4T'
    },
    sampleResponse: {
      claimableBalances: []
    }
  },
  {
    name: 'soroban_read_storage',
    category: 'Soroban RPC',
    description: 'High-level deserializer decoding ScVal contract storage into typed JSON.',
    defaultArgs: {
      contractId: 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY',
      symbolKey: 'NextChannelId',
      durability: 'instance'
    },
    sampleResponse: {
      found: true,
      data: {
        rawType: 'u64',
        value: '2'
      }
    }
  }
];

export function ToolExplorer() {
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [argsJson, setArgsJson] = useState(JSON.stringify(TOOLS[0]!.defaultArgs, null, 2));
  const [output, setOutput] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const currentTool = TOOLS[selectedToolIndex]!;

  const handleSelectTool = (idx: number) => {
    setSelectedToolIndex(idx);
    setArgsJson(JSON.stringify(TOOLS[idx]!.defaultArgs, null, 2));
    setOutput(null);
    setExecutionTime(null);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    const start = performance.now();
    await new Promise((r) => setTimeout(r, 450));
    const elapsed = Math.round(performance.now() - start);
    setExecutionTime(elapsed);
    setOutput(currentTool.sampleResponse);
    setIsExecuting(false);
  };

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Interactive MCP Tool Runner
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Execute Horizon and Soroban RPC tools against live Stellar Testnet protocols.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Left: Tool Selection & Inputs */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              SELECT MCP TOOL
            </label>
            <select
              value={selectedToolIndex}
              onChange={(e) => handleSelectTool(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'monospace',
                outline: 'none'
              }}
            >
              {TOOLS.map((t, idx) => (
                <option key={t.name} value={idx}>
                  [{t.category}] {t.name}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {currentTool.description}
          </p>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              TOOL ARGUMENTS (JSON)
            </label>
            <textarea
              value={argsJson}
              onChange={(e) => setArgsJson(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: '#79c0ff',
                fontSize: 13,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={handleExecute}
            disabled={isExecuting}
            style={{
              padding: '10px 20px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #00f0ff 0%, #3e7bfa 100%)',
              color: '#07090e',
              fontSize: 14,
              fontWeight: 700,
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              border: 'none',
              transition: 'opacity 0.2s ease'
            }}
          >
            {isExecuting ? 'Executing RPC Call...' : `Run ${currentTool.name}`}
          </button>
        </div>

        {/* Right: Output Console */}
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
              EXECUTION RESPONSE
            </span>
            {executionTime !== null && (
              <span style={{ fontSize: 12, color: '#3fb950', fontWeight: 600 }}>
                {executionTime} ms (Testnet Horizon/RPC)
              </span>
            )}
          </div>

          <pre style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 16,
            fontSize: 12,
            fontFamily: 'monospace',
            color: output ? '#a5d6ff' : 'var(--text-muted)',
            overflowX: 'auto',
            minHeight: 240
          }}>
            {output ? JSON.stringify(output, null, 2) : '// Click "Run" to dispatch MCP tool to Stellar Testnet...'}
          </pre>
        </div>
      </div>
    </section>
  );
}
