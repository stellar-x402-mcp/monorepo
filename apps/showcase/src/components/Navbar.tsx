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
            onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--text-muted)')}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block' }}>
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
            </svg>
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
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-green-hover)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-green)')}
          >
            Documentation
          </a>
        </div>
      </div>
    </header>
  );
}
