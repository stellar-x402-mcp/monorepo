import { describe, it, expect, vi } from 'vitest';
import { handleGetBalance } from '../src/tools/account.js';
import { handleSimulateContract } from '../src/tools/contract.js';
import {
  handleFindPaymentPaths,
  handleSubmitTransaction,
  handleSwapTokens,
} from '../src/tools/payment.js';
import { handleQueryEvents } from '../src/tools/events.js';

describe('Stellar MCP Server Tools', () => {
  it('should parse and format account balances from Horizon', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockResponse = {
      balances: [
        { asset_type: 'native', balance: '125.5000000' },
        { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GB...', balance: '50.0000000' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await handleGetBalance(
      { accountAddress: 'GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M', network: 'testnet' },
      mockHorizon
    );

    expect(result.balances).toHaveLength(2);
    expect(result.balances[0].asset).toBe('XLM');
    expect(result.balances[1].asset).toBe('USDC:GB...');
  });

  it('should handle simulated contract invocation responses', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockSimResult = { minResourceFee: '100', results: [{ xdr: 'AAAA...' }] };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockSimResult }),
    });

    const result = await handleSimulateContract(
      { contractId: 'CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M', method: 'get_balance', args: [], network: 'testnet' },
      mockRpc
    );

    expect(result.contractId).toBe('CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M');
    expect(result.simulatedResult).toEqual(mockSimResult);
  });

  it('should query and parse strict-receive payment paths', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockPaths = {
      _embedded: {
        records: [
          {
            source_asset_type: 'native',
            source_amount: '12.4500000',
            path: [],
          },
          {
            source_asset_type: 'credit_alphanum4',
            source_asset_code: 'EURC',
            source_asset_issuer: 'GBEUR...',
            source_amount: '9.2000000',
            path: [{ asset_type: 'native' }],
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPaths,
    });

    const result = await handleFindPaymentPaths(
      {
        sourceAccount: 'GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M',
        destinationAccount: 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6',
        destinationAsset: 'USDC:GBUSDC...',
        destinationAmount: '10.00',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.availablePaths).toHaveLength(2);
    expect(result.availablePaths[0].sourceAsset).toBe('XLM');
    expect(result.availablePaths[1].sourceAsset).toBe('EURC:GBEUR...');
  });

  it('should submit transaction envelopes and return tx hash', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockTxResult = {
      hash: '3f7b2c...1a9e',
      ledger: 104523,
      successful: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTxResult,
    });

    const result = await handleSubmitTransaction(
      {
        signedEnvelopeXdr: 'AAAA...',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.hash).toBe('3f7b2c...1a9e');
    expect(result.successful).toBe(true);
  });

  it('should query and parse Soroban contract events from RPC', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockEventsResponse = {
      result: {
        latestLedger: 105430,
        cursor: '0000105430-0000000001',
        events: [
          {
            type: 'contract',
            ledger: 105429,
            contractId: 'CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M',
            id: '0000105429-0000000001',
            topic: ['AAAABQAAAAdkZXBvc2l0AAAA', 'AAAAAQAAAA=='],
            value: { xdr: 'AAAAAQAAAAM=' },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockEventsResponse,
    });

    const result = await handleQueryEvents(
      {
        contractIds: ['CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M'],
        startLedger: 105400,
        limit: 10,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.latestLedger).toBe(105430);
    expect(result.cursor).toBe('0000105430-0000000001');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].contractId).toBe('CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M');
  });

  it('should return error structure when Soroban RPC returns an error', async () => {
    const mockRpc = 'https://rpc.mock';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: { code: -32600, message: 'Invalid startLedger requested' },
      }),
    });

    const result = await handleQueryEvents(
      {
        startLedger: 999999999,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.error).toBe('Invalid startLedger requested');
    expect(result.code).toBe(-32600);
  });

  it('should construct unsigned path payment swap transaction envelope', async () => {
    const mockHorizon = 'https://horizon.mock';
    const sourceAccount = 'GBHI7IOIZNTMZ5NKBQGTFSL62QLKVIIAKO54WDJRF2JWTMERZU7JQRGK';
    const destinationAccount = 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6';
    const usdcIssuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/paths/strict-receive')) {
        return {
          ok: true,
          json: async () => ({
            _embedded: {
              records: [
                {
                  source_asset_type: 'native',
                  source_amount: '12.4500000',
                  path: [],
                },
              ],
            },
          }),
        };
      }
      if (url.includes(`/accounts/${sourceAccount}`)) {
        return {
          ok: true,
          json: async () => ({
            id: sourceAccount,
            sequence: '10023450',
          }),
        };
      }
      return { ok: false, statusText: 'Not found' };
    });

    const result = await handleSwapTokens(
      {
        sourceAccount,
        destinationAccount,
        sendAsset: 'native',
        sendMax: '15.00',
        destAsset: `USDC:${usdcIssuer}`,
        destAmount: '10.00',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.status).toBe('ready_for_signing');
    expect(result.unsignedEnvelopeXdr).toBeDefined();
    expect(typeof result.unsignedEnvelopeXdr).toBe('string');
    expect(result.sourceAccount).toBe(sourceAccount);
    expect(result.sendAsset).toBe('native');
    expect(result.destAmount).toBe('10.00');
  });

  it('should submit signed swap transaction when signedEnvelopeXdr is provided', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockTxResult = {
      hash: 'swap_tx_hash_12345',
      ledger: 104550,
      successful: true,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTxResult,
    });

    const result = await handleSwapTokens(
      {
        sourceAccount: 'GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M',
        sendAsset: 'native',
        sendMax: '15.00',
        destAsset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        destAmount: '10.00',
        signedEnvelopeXdr: 'AAAA_SIGNED_SWAP_XDR',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.hash).toBe('swap_tx_hash_12345');
    expect(result.successful).toBe(true);
  });
});
