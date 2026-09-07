import { describe, it, expect, vi } from 'vitest';
import { handleGetBalance } from '../src/tools/account.js';
import {
  handleSimulateContract,
  handleGetLedgerEntries,
  handleGetTransaction,
} from '../src/tools/contract.js';
import {
  handleFindPaymentPaths,
  handleSubmitTransaction,
  handleSwapTokens,
} from '../src/tools/payment.js';
import { handleQueryEvents } from '../src/tools/events.js';
import { handleGetLatestLedger, handleGetNetwork } from '../src/tools/network.js';

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

  it('should query Soroban ledger entries with explicit keys', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockResponse = {
      result: {
        latestLedger: 105600,
        entries: [
          {
            key: 'AAAABgAAAAHO6x4VTDbU6IbLxmDHj88OWONp+FjMmaDq6QivmUZX+wAAABQAAAAB',
            xdr: 'AAAAAQAAAA==',
            lastModifiedLedgerSeq: 105550,
            liveUntilLedgerSeq: 120000,
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await handleGetLedgerEntries(
      {
        keys: ['AAAABgAAAAHO6x4VTDbU6IbLxmDHj88OWONp+FjMmaDq6QivmUZX+wAAABQAAAAB'],
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.latestLedger).toBe(105600);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].lastModifiedLedgerSeq).toBe(105550);
  });

  it('should query Soroban ledger entries auto-constructing LedgerKey from contractId', async () => {
    const mockRpc = 'https://rpc.mock';
    const contractId = 'CDHOWHQVJQ3NJ2EGZPDGBR4PZ4HFRY3J7BMMZGNA5LUQRL4ZIZL7X5LV';
    const mockResponse = {
      result: {
        latestLedger: 105602,
        entries: [
          {
            key: 'AUTO_GENERATED_KEY_XDR',
            xdr: 'ENTRY_DATA_XDR',
            lastModifiedLedgerSeq: 105500,
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await handleGetLedgerEntries(
      {
        contractId,
        keySymbol: 'counter',
        durability: 'persistent',
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.latestLedger).toBe(105602);
    expect(result.entries).toHaveLength(1);
    expect(result.queriedKeys).toHaveLength(1);
    expect(typeof result.queriedKeys[0]).toBe('string');
  });

  it('should return error when Soroban RPC getLedgerEntries fails', async () => {
    const mockRpc = 'https://rpc.mock';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: { code: -32602, message: 'Invalid keys parameter' },
      }),
    });

    const result = await handleGetLedgerEntries(
      {
        keys: ['INVALID_KEY'],
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.error).toBe('Invalid keys parameter');
    expect(result.code).toBe(-32602);
  });

  it('should query Soroban transaction status and execution details from RPC', async () => {
    const mockRpc = 'https://rpc.mock';
    const txHash = 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0';
    const mockTxData = {
      status: 'SUCCESS',
      latestLedger: 105650,
      latestLedgerCloseTime: '1725712500',
      ledger: 105645,
      createdAt: '1725712480',
      applicationOrder: 1,
      feeBump: false,
      envelopeXdr: 'AAAA_ENVELOPE_XDR',
      resultXdr: 'AAAA_RESULT_XDR',
      resultMetaXdr: 'AAAA_META_XDR',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockTxData }),
    });

    const result = await handleGetTransaction(
      {
        hash: txHash,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.status).toBe('SUCCESS');
    expect(result.ledger).toBe(105645);
    expect(result.envelopeXdr).toBe('AAAA_ENVELOPE_XDR');
    expect(result.resultXdr).toBe('AAAA_RESULT_XDR');
  });

  it('should return NOT_FOUND status when transaction is not in retention window', async () => {
    const mockRpc = 'https://rpc.mock';
    const txHash = '0000000000000000000000000000000000000000000000000000000000000000';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          status: 'NOT_FOUND',
          latestLedger: 105655,
        },
      }),
    });

    const result = await handleGetTransaction(
      {
        hash: txHash,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.status).toBe('NOT_FOUND');
    expect(result.latestLedger).toBe(105655);
  });

  it('should fetch latest ledger sequence and protocol version from Soroban RPC', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockLedgerData = {
      id: '63d7e8b6b28b7e2832810a9a8f2780e1a1796521ecda53bbbfef21e63a563914',
      protocolVersion: 21,
      sequence: 125890,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockLedgerData }),
    });

    const result = await handleGetLatestLedger({ network: 'testnet' }, mockRpc);

    expect(result.id).toBe('63d7e8b6b28b7e2832810a9a8f2780e1a1796521ecda53bbbfef21e63a563914');
    expect(result.protocolVersion).toBe(21);
    expect(result.sequence).toBe(125890);
  });

  it('should return error when Soroban RPC returns an error object for getLatestLedger', async () => {
    const mockRpc = 'https://rpc.mock';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: {
          code: -32603,
          message: 'Internal RPC error',
        },
      }),
    });

    const result = await handleGetLatestLedger({ network: 'testnet' }, mockRpc);

    expect(result.error).toBe('Internal RPC error');
    expect(result.code).toBe(-32603);
  });

  it('should fetch network passphrase, protocol version, and friendbot URL from Soroban RPC', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockNetworkData = {
      friendbotUrl: 'https://friendbot.stellar.org',
      passphrase: 'Test SDF Network ; September 2015',
      protocolVersion: 21,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockNetworkData }),
    });

    const result = await handleGetNetwork({ network: 'testnet' }, mockRpc);

    expect(result.friendbotUrl).toBe('https://friendbot.stellar.org');
    expect(result.passphrase).toBe('Test SDF Network ; September 2015');
    expect(result.protocolVersion).toBe(21);
  });

  it('should handle RPC errors gracefully when querying getNetwork', async () => {
    const mockRpc = 'https://rpc.mock';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      }),
    });

    const result = await handleGetNetwork({ network: 'testnet' }, mockRpc);

    expect(result.error).toBe('Invalid Request');
    expect(result.code).toBe(-32600);
  });
});
