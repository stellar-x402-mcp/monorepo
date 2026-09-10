'use client';

import React from 'react';

export function Navbar() {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'rgba(13, 17, 23, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 24px'
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
        {/* Brand */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img
            src="/icon.svg"
            alt="Stellar x402 Logo"
            width={32}
            height={32}
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              display: 'block'
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              stellar-x402-mcp
            </span>
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 10,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)'
            }}>
              v0.1.0
            </span>
          </div>
        </a>

        {/* Quick Nav Anchor Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <a href="#sandbox" style={{ transition: 'color 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}>
            Sandbox
          </a>
          <a href="#explorer" style={{ transition: 'color 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}>
            Tools
          </a>
          <a href="#simulator" style={{ transition: 'color 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}>
            Simulator
          </a>
          <a href="#benchmarks" style={{ transition: 'color 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}>
            Gas Benchmarks
          </a>
          <a href="#errors" style={{ transition: 'color 0.15s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = '#f0f6fc')} onMouseOut={(e) => (e.currentTarget.style.color = '#8b949e')}>
            Errors
          </a>
        </nav>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 10px',
            borderRadius: 12,
            backgroundColor: 'rgba(63, 185, 80, 0.1)',
            border: '1px solid rgba(63, 185, 80, 0.3)',
            fontSize: 11,
            color: '#3fb950',
            fontWeight: 500
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#3fb950',
              display: 'inline-block'
            }}></span>
            Protocol 22
          </div>

          <a
            href="https://github.com/stellar-x402-mcp/monorepo"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: 13,
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            GitHub
          </a>

          <a
            href="https://emeditweb.gitbook.io/x402"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              backgroundColor: 'var(--accent-green)',
              border: '1px solid rgba(240, 246, 252, 0.1)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background-color 0.15s ease'
            }}
          >
            Documentation &rarr;
          </a>
        </div>
      </div>
    </header>
  );
}
