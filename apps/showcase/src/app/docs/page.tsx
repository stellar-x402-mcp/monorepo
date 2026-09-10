'use client';

import React, { useEffect } from 'react';
import { Navbar } from '../../components/Navbar';

export default function DocsPage() {
  useEffect(() => {
    window.location.replace('https://emeditweb.gitbook.io/x402');
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #00f0ff 0%, #3e7bfa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#07090e',
          fontSize: 24,
          marginBottom: 24
        }}>
          x4
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
          Redirecting to GitBook Documentation...
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 480, lineHeight: 1.5 }}>
          The official interactive documentation suite for stellar-x402-mcp is hosted on GitBook.
        </p>
        <a
          href="https://emeditweb.gitbook.io/x402"
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #00f0ff 0%, #3e7bfa 100%)',
            color: '#07090e',
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none'
          }}
        >
          Go to GitBook Documentation &rarr;
        </a>
      </div>
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        textAlign: 'center',
        color: 'var(--text-secondary)',
        fontSize: 13,
        backgroundColor: 'var(--bg-secondary)'
      }}>
        stellar-x402-mcp © 2026. Open source developer tooling built for the Stellar Blockchain
      </footer>
    </div>
  );
}
