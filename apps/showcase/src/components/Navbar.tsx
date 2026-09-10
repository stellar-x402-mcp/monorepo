'use client';

import React from 'react';

export function Navbar() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'rgba(13, 17, 23, 0.8)',
      backdropFilter: 'blur(8px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '16px 24px'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img
            src="/icon.svg"
            alt="Stellar x402 Logo"
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: 'block'
            }}
          />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              stellar-x402-mcp
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Developer Tooling and Multi-Payment Framework
            </p>
          </div>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 20,
            backgroundColor: 'rgba(46, 160, 67, 0.15)',
            border: '1px solid rgba(46, 160, 67, 0.4)',
            fontSize: 12,
            color: '#3fb950',
            fontWeight: 600
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#3fb950',
              display: 'inline-block'
            }}></span>
            Testnet: Protocol 22 Active
          </div>

          <a
            href="https://emeditweb.gitbook.io/x402"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.3)',
              color: 'var(--accent-cyan)',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease'
            }}
          >
            Documentation
          </a>

          <a
            href="https://github.com/stellar-x402-mcp/monorepo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.2s ease'
            }}
          >
            GitHub
          </a>

          <a
            href="https://stellar.expert/explorer/testnet/contract/CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              background: 'linear-gradient(135deg, #3e7bfa 0%, #7928ca 100%)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Testnet Explorer
          </a>
        </div>
      </div>
    </header>
  );
}
