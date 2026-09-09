'use client';

import React from 'react';
import { Navbar } from '../components/Navbar';
import { ToolExplorer } from '../components/ToolExplorer';
import { PaywallSimulator } from '../components/PaywallSimulator';
import { GasBenchmarkViewer } from '../components/GasBenchmarkViewer';
import { ErrorRegistryViewer } from '../components/ErrorRegistryViewer';

export default function Home() {
  const contractId = 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', flex: 1, width: '100%' }}>
        {/* Hero Section */}
        <section style={{ textAlign: 'center', maxWidth: 880, margin: '0 auto 48px auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 20,
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            color: 'var(--accent-cyan)',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 20
          }}>
            <span>Institutional Developer Tooling & Multi-Payment Protocol</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: 20,
            background: 'linear-gradient(180deg, #ffffff 0%, #8b949e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Model Context Protocol for Stellar & Soroban
          </h1>

          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 32 }}>
            Empowering autonomous AI agents with standardized Horizon and Soroban RPC tools, combined with an HTTP 402 micro-payment settlement framework supporting Native XLM, Soroban SAC tokens, DEX Path Payments, and State Channels.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <a
              href="#explorer"
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #00f0ff 0%, #3e7bfa 100%)',
                color: '#07090e',
                fontSize: 14,
                fontWeight: 700
              }}
            >
              Explore MCP Tools
            </a>
            <a
              href="#simulator"
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              x402 Paywall Simulator
            </a>
            <a
              href="#errors"
              style={{
                padding: '12px 24px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              250 Error Codes
            </a>
          </div>
        </section>

        {/* Feature Overview Grid */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginBottom: 48
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>17+</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Production MCP Tools
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Complete Horizon and Soroban RPC coverage: balances, contract simulation, envelopes, orderbooks, liquidity pools, and live SSE streams.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>250</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Standard Error Codes
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Granular, machine-actionable error taxonomy across Protocol, Horizon, Soroban, Paywall, Replay, Client, and DEX domains with remedies.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>5,908 B</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Ultra-Low Gas Escrow
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Optimized Soroban State Channel contract deployed to Testnet, enabling 99.8% gas savings for autonomous AI agents.
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20
          }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>7</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Stellar Payment Systems
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Native XLM, SAC USDC, Path Payments (strict send/receive), Claimable Balances, Fee-Bumps, State Channels, and AMM Swaps.
            </p>
          </div>
        </section>

        {/* Interactive Tool Runner */}
        <div id="explorer">
          <ToolExplorer />
        </div>

        {/* x402 Simulator */}
        <div id="simulator">
          <PaywallSimulator />
        </div>

        {/* Gas & Benchmarks */}
        <div id="benchmarks">
          <GasBenchmarkViewer />
        </div>

        {/* 250 Error Codes Directory */}
        <div id="errors">
          <ErrorRegistryViewer />
        </div>

        {/* Grantfox & Drips Submission Section */}
        <section style={{
          marginTop: 64,
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          borderRadius: 16,
          padding: 32
        }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Grantfox & Drips Submission Package
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 6, color: 'var(--text-primary)' }}>
              Verified Deployment and Architectural References
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 20
          }}>
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                GitHub Repository &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Full source code, CI/CD pipelines, and tests
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Testnet Contract Explorer &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Verified on-chain contract and transaction receipts
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Stellar Laboratory &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Live RPC invocation and ledger inspection harness
              </span>
            </a>

            <a
              href="https://github.com/EmeditWeb/stellar-agentic-planning"
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
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                Planning Repository &rarr;
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Architecture Decision Records and 11-milestone roadmap
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
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        stellar-x402-mcp &copy; 2026. Open source developer tooling built for the Stellar Community Fund, Grantfox, and Drips.
      </footer>
    </div>
  );
}
