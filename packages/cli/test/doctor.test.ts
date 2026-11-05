import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkNodeEnvironment,
  checkCryptoEngine,
  checkHorizonConnectivity,
  checkSorobanRpcConnectivity,
  executeDoctorDiagnostics,
} from '../src/commands/doctor.js';

describe('CLI Doctor Diagnostic Command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates current Node.js runtime compatibility', () => {
    const result = checkNodeEnvironment();
    expect(result.name).toBe('Node.js Runtime');
    expect(result.status).toBe('pass');
    expect(result.message).toContain('meets production requirement');
    expect(result.details?.version).toBe(process.version);
  });

  it('verifies Ed25519 cryptography engine and keypair generation', () => {
    const result = checkCryptoEngine();
    expect(result.name).toBe('Ed25519 Cryptography Engine');
    expect(result.status).toBe('pass');
    expect(result.details?.samplePublicKey).toBeDefined();
    expect(result.details?.samplePublicKey.startsWith('G')).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('verifies Horizon connectivity with successful mock response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        core_version: 'v20.2.0',
        horizon_version: '2.30.0',
        core_latest_ledger: 123456,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkHorizonConnectivity('https://horizon-testnet.stellar.org');
    expect(result.status).toBe('pass');
    expect(result.details?.coreVersion).toBe('v20.2.0');
    expect(result.details?.currentLedger).toBe(123456);
  });

  it('handles Horizon failure or timeout with fail status', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkHorizonConnectivity('https://invalid-horizon.stellar.org');
    expect(result.status).toBe('fail');
    expect(result.message).toContain('ECONNREFUSED');
  });

  it('verifies Soroban RPC getHealth check with healthy result', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: {
          status: 'healthy',
          latestLedger: 500123,
        },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkSorobanRpcConnectivity('https://soroban-testnet.stellar.org');
    expect(result.status).toBe('pass');
    expect(result.details?.status).toBe('healthy');
  });

  it('handles Soroban RPC connection error gracefully', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));
    vi.stubGlobal('fetch', mockFetch);

    const result = await checkSorobanRpcConnectivity('https://invalid-soroban.stellar.org');
    expect(result.status).toBe('fail');
    expect(result.message).toContain('ETIMEDOUT');
  });

  it('executes complete doctor report and outputs structured diagnostics', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        core_version: 'v20.2.0',
        horizon_version: '2.30.0',
        result: { status: 'healthy' },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const report = await executeDoctorDiagnostics({ network: 'testnet' });
    expect(report.healthy).toBe(true);
    expect(report.network).toBe('testnet');
    expect(report.checks.length).toBe(4);
    expect(report.checks.every((c) => c.status === 'pass')).toBe(true);
  });
});
