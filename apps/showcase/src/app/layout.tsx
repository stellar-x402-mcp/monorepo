import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stellar x402 MCP: Institutional AI Agent Tooling & Payment Settlement',
  description:
    'Production Model Context Protocol (MCP) server for Stellar Horizon and Soroban RPC with HTTP 402 micro-payment settlement framework.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
