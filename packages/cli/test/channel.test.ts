import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  stroopsToXlm,
  fetchChannelState,
  loadDeploymentHistory,
  runChannelInspect,
  runChannelHistory,
  DEFAULT_CONTRACT_ID,
  VERIFIED_TRANSACTIONS,
} from '../src/commands/channel.js';

describe('CLI Channel Command and Soroban Inspection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly converts stroops to human-readable XLM strings', () => {
    expect(stroopsToXlm('10000000')).toBe('1.0000000');
    expect(stroopsToXlm('5000000')).toBe('0.5000000');
    expect(stroopsToXlm('2000000')).toBe('0.2000000');
    expect(stroopsToXlm('0')).toBe('0.0000000');
    expect(stroopsToXlm('100')).toBe('0.0000100');
  });

  it('fetches verified state for Channel #1 (closed post settlement)', async () => {
    const channel = await fetchChannelState(1);
    expect(channel.channelId).toBe(1);
    expect(channel.contractId).toBe(DEFAULT_CONTRACT_ID);
    expect(channel.closed).toBe(true);
    expect(channel.deposited).toBe('10000000');
    expect(channel.depositedXlm).toBe('1.0000000');
    expect(channel.claimed).toBe('2000000');
    expect(channel.claimedXlm).toBe('0.2000000');
    expect(channel.remaining).toBe('0');
    expect(channel.nonce).toBe(1);
  });

  it('fetches verified state for Channel #2 (currently active)', async () => {
    const channel = await fetchChannelState(2);
    expect(channel.channelId).toBe(2);
    expect(channel.contractId).toBe(DEFAULT_CONTRACT_ID);
    expect(channel.closed).toBe(false);
    expect(channel.deposited).toBe('5000000');
    expect(channel.depositedXlm).toBe('0.5000000');
    expect(channel.claimed).toBe('0');
    expect(channel.remaining).toBe('5000000');
    expect(channel.remainingXlm).toBe('0.5000000');
    expect(channel.nonce).toBe(0);
  });

  it('fetches dynamic channel state via live RPC simulation for new channel', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { sequence: 5573000 },
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const channel = await fetchChannelState(99, { contractId: 'CCUSTOMCONTRACT123456789' });
    expect(channel.channelId).toBe(99);
    expect(channel.contractId).toBe('CCUSTOMCONTRACT123456789');
    expect(channel.expiryLedger).toBe(5583000);
    expect(channel.closed).toBe(false);
  });

  it('loads deployment transaction history with verified hashes', () => {
    const history = loadDeploymentHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(4);

    const openTx = history.find((h) => h.operation === 'open_channel' && h.channelId === 1);
    expect(openTx).toBeDefined();
    expect(openTx?.txHash).toBe('5a10a65375184f8605e842dff3610406e5abf8756a4c885ade8e8a2c8707f8b5');
    expect(openTx?.status).toBe('success');

    const claimTx = history.find((h) => h.operation === 'claim_payment');
    expect(claimTx).toBeDefined();
    expect(claimTx?.txHash).toBe('afea09f19b8a738ec340919ae42941d21549ab14ec7e2ae12da542be76223c29');

    const closeTx = history.find((h) => h.operation === 'close_channel');
    expect(closeTx).toBeDefined();
    expect(closeTx?.txHash).toBe('3dd3434ce35cff8e3a5308a5cf2b853471497cc09152e8cf39f85e43f44508a4');

    const activeTx = history.find((h) => h.operation === 'open_channel' && h.channelId === 2);
    expect(activeTx).toBeDefined();
    expect(activeTx?.status).toBe('active');
  });

  it('prints structured JSON when runChannelInspect is called with --json', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runChannelInspect('2', { json: true });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(parsed.channelId).toBe(2);
    expect(parsed.closed).toBe(false);
    expect(parsed.deposited).toBe('5000000');
  });

  it('handles invalid channel id gracefully in runChannelInspect', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await runChannelInspect('invalid_id');

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0]?.[0]).toContain('Invalid channel ID');
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it('prints structured JSON when runChannelHistory is called with --json', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await runChannelHistory({ json: true });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0];
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(4);
  });
});
