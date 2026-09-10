'use client';

import React from 'react';

export function GasBenchmarkViewer() {
  const contractId = 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY';
  const wasmHash = 'dcf795a2daff9472f0796ca0188e4f5cae0c868a68cd70dc755557708b4efdb3';

  const benchmarks = [
    {
      operation: 'open_channel',
      cpu: '289,245',
      mem: '112,575 B',
      fee: '200 stroops',
      desc: 'Locks SAC tokens in escrow and initializes monotonic sequence state'
    },
    {
      operation: 'claim_payment',
      cpu: '320,109',
      mem: '120,025 B',
      fee: '250 stroops',
      desc: 'Merchant settles cumulative off-chain vouchers with monotonic delta payout'
    },
    {
      operation: 'close_channel',
      cpu: '322,217',
      mem: '115,317 B',
      fee: '220 stroops',
      desc: 'Cooperative close returning unspent balance to payer'
    },
    {
      operation: 'off-chain voucher',
      cpu: '0',
      mem: '0 B',
      fee: '0 stroops',
      desc: 'Ed25519 signed state update exchange between agent and server'
    }
  ];

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Soroban State Channel Gas Optimization and Benchmarks
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Micro-payment state channel smart contract deployed to Stellar Testnet, optimized for ultra-low gas consumption.
        </p>
      </div>

      {/* Contract Details Banner */}
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#3fb950',
              display: 'inline-block'
            }}></span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Deployed Contract (Testnet)
            </span>
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 4,
            backgroundColor: 'rgba(47, 129, 247, 0.15)',
            color: 'var(--accent-blue)'
          }}>
            Optimized Size: 5,908 Bytes
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Contract Address:</div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 13,
            backgroundColor: 'var(--bg-card)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            wordBreak: 'break-all'
          }}>
            {contractId}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>WASM Bytecode SHA-256 Hash:</div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 12,
            backgroundColor: 'var(--bg-card)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            wordBreak: 'break-all'
          }}>
            {wasmHash}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${contractId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-blue)',
              textDecoration: 'underline'
            }}
          >
            View on Stellar.expert Explorer &rarr;
          </a>
          <a
            href={`https://lab.stellar.org/r/testnet/contract/${contractId}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--accent-blue)',
              textDecoration: 'underline'
            }}
          >
            Interact in Stellar Laboratory &rarr;
          </a>
        </div>
      </div>

      {/* Benchmark Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16
      }}>
        {benchmarks.map((b, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>
              {b.operation}()
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>CPU Cost:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {b.cpu}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Memory:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {b.mem}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Network Fee:</span>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#3fb950' }}>
                {b.fee}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
              {b.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
