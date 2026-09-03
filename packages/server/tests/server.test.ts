import { describe, it, expect, vi } from 'vitest';
import { handleGetBalance } from '../src/tools/account.js';
import { handleSimulateContract } from '../src/tools/contract.js';
import { handleFindPaymentPaths, handleSubmitTransaction } from '../src/tools/payment.js';

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
});
