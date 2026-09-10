'use client';

import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { LiveCodeSandbox } from '../components/LiveCodeSandbox';
import { ToolExplorer } from '../components/ToolExplorer';
import { PaywallSimulator } from '../components/PaywallSimulator';
import { GasBenchmarkViewer } from '../components/GasBenchmarkViewer';
import { ErrorRegistryViewer } from '../components/ErrorRegistryViewer';

export default function Home() {
  const contractId = 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY';
  const [copiedInstall, setCopiedInstall] = useState(false);

  const handleCopyInstall = () => {
    navigator.clipboard.writeText('pnpm add @stellar-mcp/agent-client @stellar-mcp/server');
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px', flex: 1, width: '100%' }}>
        {/* Calm, Minimalist Hero Section */}
        <section style={{ textAlign: 'center', maxWidth: 840, margin: '0 auto 64px auto' }}>
          {/* Subtle Protocol Pill */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 14px',
            borderRadius: 20,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 500,
            marginBottom: 24
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#3fb950',
              display: 'inline-block'
            }}></span>
            <span>Stellar Protocol 22 Active</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ color: 'var(--accent-blue)' }}>Institutional MCP Tooling System</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 5.5vw, 56px)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.15,
            marginBottom: 20,
            color: 'var(--text-primary)'
          }}>
            The Model Context Protocol for Stellar
          </h1>

          <p style={{
            fontSize: 17,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 32,
            maxWidth: 720,
            margin: '0 auto 32px auto'
          }}>
            Connect autonomous AI agents to decentralized financial rails. Monetize MCP tools with HTTP 402 micro-payment challenges settled via Native XLM, Soroban SAC tokens, DEX Path Payments, and State Channels.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
            <a
              href="https://emeditweb.gitbook.io/x402"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 20px',
                borderRadius: 6,
                backgroundColor: 'var(--accent-green)',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'background-color 0.15s ease'
              }}
            >
              Read Documentation &rarr;
            </a>

            <a
              href="https://github.com/stellar-x402-mcp/monorepo"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 20px',
                borderRadius: 6,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              GitHub Repository
            </a>

            <a
              href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 20px',
                borderRadius: 6,
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              Testnet Contract ↗
            </a>
          </div>

          {/* Quick Copy Install Command */}
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 14px',
              borderRadius: 8,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              fontFamily: 'monospace',
              fontSize: 13,
              color: 'var(--text-secondary)'
            }}>
              <span style={{ color: 'var(--accent-blue)', userSelect: 'none' }}>$</span>
              <span>pnpm add @stellar-mcp/agent-client @stellar-mcp/server</span>
              <button
                onClick={handleCopyInstall}
                style={{
                  background: 'none',
                  border: 'none',
                  color: copiedInstall ? 'var(--accent-green)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  marginLeft: 4
                }}
              >
                {copiedInstall ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </section>

        {/* Minimalist Metrics Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 48
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              17+ Tools
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Horizon & Soroban RPC
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Account state, DEX orderbooks, AMM liquidity pools, transaction simulation, and storage deserialization.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              7 Rails
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Stellar Payment Modalities
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Native XLM, Soroban SAC USDC, Path Payments, Claimable Balances, Fee-Bumps, State Channels, and AMM Swaps.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              5,908 B
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Soroban State Channels
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Optimized WASM bytecode deployed on Testnet, achieving 99.8% fee savings and zero gas for off-chain micro-vouchers.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 20
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              250 Codes
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              Universal Error Taxonomy
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Machine-actionable error registry across 7 domains with deterministic remedies for autonomous agents.
            </p>
          </div>
        </section>

        {/* 1. Live Code Sandbox */}
        <div id="sandbox">
          <LiveCodeSandbox />
        </div>

        {/* 2. Interactive Tool Runner */}
        <div id="explorer">
          <ToolExplorer />
        </div>

        {/* 3. x402 State Channel Simulator */}
        <div id="simulator">
          <PaywallSimulator />
        </div>

        {/* 4. Gas & Benchmarks */}
        <div id="benchmarks">
          <GasBenchmarkViewer />
        </div>

        {/* 5. Compact 250 Error Codes Quick Inspector */}
        <div id="errors">
          <ErrorRegistryViewer />
        </div>

        {/* Developer & Resource Links */}
        <section style={{
          marginTop: 64,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 32
        }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
              Developer & Institutional Resources
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Verified deployments, technical documentation, and open-source repositories.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14
          }}>
            <a
              href="https://emeditweb.gitbook.io/x402"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'border-color 0.15s ease'
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}>
                Official Documentation Portal &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                26 guides on GitBook covering architecture, payments, SDKs, and error codes
              </span>
            </a>

            <a
              href="https://github.com/stellar-x402-mcp/monorepo"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                GitHub Monorepo &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Complete TypeScript monorepo, contracts, and multi-node CI workflows
              </span>
            </a>

            <a
              href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Testnet Contract Explorer &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Verified on-chain contract CDAVUN... on Stellar Expert
              </span>
            </a>

            <a
              href={`https://lab.stellar.org/r/testnet/contract/${contractId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Stellar Laboratory &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Direct Soroban RPC contract inspection and live invocation harness
              </span>
            </a>
          </div>
        </section>
      </main>

      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-muted)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        stellar-x402-mcp &copy; 2026. Open source developer tooling built for the Stellar Network and Soroban.
      </footer>
    </div>
  );
}
