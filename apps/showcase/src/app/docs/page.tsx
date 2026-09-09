'use client';

import React from 'react';
import { Navbar } from '../../components/Navbar';
import { DocumentationViewer } from '../../components/DocumentationViewer';

export default function DocsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      <DocumentationViewer />
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
