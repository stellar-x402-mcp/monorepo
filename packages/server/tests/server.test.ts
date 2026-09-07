import { describe, it, expect, vi } from 'vitest';
import { Account, Address, Keypair, Networks, Operation, rpc, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { handleGetBalance, handleGetAccountDetails } from '../src/tools/account.js';
import {
  handleSimulateContract,
  handleGetLedgerEntries,
  handleGetTransaction,
  handleAssembleTransaction,
  handleReadStorage,
} from '../src/tools/contract.js';
import {
  handleFindPaymentPaths,
  handleSubmitTransaction,
  handleSwapTokens,
} from '../src/tools/payment.js';
import { handleQueryEvents } from '../src/tools/events.js';
import { handleGetLatestLedger, handleGetNetwork } from '../src/tools/network.js';
import { handleGetOrderbook, handleGetLiquidityPools } from '../src/tools/dex.js';
import { handleGetClaimableBalances } from '../src/tools/claimable.js';

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

  it('should parse CPU instructions, memory bytes, min fee, and auth entries from simulation', async () => {
    const mockRpc = 'https://rpc.mock';
    const mockSimResult = {
      minResourceFee: '15400',
      cost: {
        cpuInsns: '845000',
        memBytes: '131072',
      },
      results: [
        {
          xdr: 'AAAAEgAAAAAAAAAA',
          auth: ['AAAA...AUTH_ENTRY...'],
        },
      ],
      transactionData: 'AAAA...FOOTPRINT_DATA...',
      events: [{ type: 'contract', contractId: 'CA7Q...', topic: [], value: 'AAAA...' }],
      latestLedger: 105990,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: mockSimResult }),
    });

    const result = await handleSimulateContract(
      {
        contractId: 'CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA64P7TVKU2M',
        method: 'transfer',
        args: [],
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.minResourceFee).toBe('15400');
    expect(result.cpuInstructions).toBe(845000);
    expect(result.memoryBytes).toBe(131072);
    expect(result.returnValueXdr).toBe('AAAAEgAAAAAAAAAA');
    expect(result.auth).toEqual(['AAAA...AUTH_ENTRY...']);
    expect(result.transactionData).toBe('AAAA...FOOTPRINT_DATA...');
    expect(result.latestLedger).toBe(105990);
  });

  it('should simulate raw transaction envelope XDR when provided', async () => {
    const mockRpc = 'https://rpc.mock';
    let requestedPayload: any = null;

    global.fetch = vi.fn().mockImplementation(async (_url, opts) => {
      requestedPayload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          result: {
            minResourceFee: '2000',
            results: [{ xdr: 'AAAA' }],
          },
        }),
      };
    });

    const result = await handleSimulateContract(
      {
        transactionXdr: 'AAAA_RAW_ENVELOPE_XDR',
        network: 'testnet',
      },
      mockRpc
    );

    expect(requestedPayload.params.transaction).toBe('AAAA_RAW_ENVELOPE_XDR');
    expect(result.minResourceFee).toBe('2000');
  });

  it('should assemble transaction envelope with footprint and resource fees', async () => {
    const mockRpc = 'https://rpc.mock';
    const sourceKey = Keypair.random().publicKey();
    const contractId = 'CDHOWHQVJQ3NJ2EGZPDGBR4PZ4HFRY3J7BMMZGNA5LUQRL4ZIZL7X5LV';

    const account = new Account(sourceKey, '100');
    const op = Operation.invokeContractFunction({
      contract: contractId,
      function: 'test_func',
      args: [],
    });
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: Networks.TESTNET })
      .addOperation(op)
      .setTimeout(30)
      .build();

    const unAssembledXdr = tx.toXDR();

    const mockPreparedTx = {
      toXDR: () => 'AAAA_ASSEMBLED_TRANSACTION_XDR',
      fee: '2100',
      source: sourceKey,
      sequence: '101',
    };

    const prepareSpy = vi.spyOn(rpc.Server.prototype, 'prepareTransaction').mockResolvedValue(mockPreparedTx as any);

    const result = await handleAssembleTransaction(
      {
        transactionXdr: unAssembledXdr,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.assembledTransactionXdr).toBe('AAAA_ASSEMBLED_TRANSACTION_XDR');
    expect(result.fee).toBe('2100');
    expect(result.source).toBe(sourceKey);
    expect(result.network).toBe('testnet');
    prepareSpy.mockRestore();
  });

  it('should handle errors when transaction envelope assembly fails', async () => {
    const mockRpc = 'https://rpc.mock';

    const result = await handleAssembleTransaction(
      {
        transactionXdr: 'INVALID_BASE64_XDR',
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.error).toBeDefined();
  });

  it('should deserialize contract admin address from storage into native JSON string', async () => {
    const mockRpc = 'https://rpc.mock';
    const contractId = 'CDHOWHQVJQ3NJ2EGZPDGBR4PZ4HFRY3J7BMMZGNA5LUQRL4ZIZL7X5LV';
    const adminKp = Keypair.random();
    const adminAddress = adminKp.publicKey();

    const contractAddress = new Address(contractId);
    const scKey = xdr.ScVal.scvSymbol('admin');
    const scVal = new Address(adminAddress).toScVal();

    const contractData = new xdr.ContractDataEntry({
      contract: contractAddress.toScAddress(),
      key: scKey,
      durability: xdr.ContractDataDurability.persistent(),
      val: scVal,
      ext: new xdr.ExtensionPoint(0),
    });

    const entryData = xdr.LedgerEntryData.contractData(contractData);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          latestLedger: 105990,
          entries: [
            {
              xdr: entryData.toXDR('base64'),
              lastModifiedLedgerSeq: 105900,
              liveUntilLedgerSeq: 108900,
            },
          ],
        },
      }),
    });

    const result = await handleReadStorage(
      {
        contractId,
        key: 'admin',
        keyType: 'symbol',
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.found).toBe(true);
    expect(result.decodedValue).toBe(adminAddress);
    expect(result.lastModifiedLedgerSeq).toBe(105900);
  });

  it('should deserialize SAC token balance I128 numbers cleanly', async () => {
    const mockRpc = 'https://rpc.mock';
    const contractId = 'CDHOWHQVJQ3NJ2EGZPDGBR4PZ4HFRY3J7BMMZGNA5LUQRL4ZIZL7X5LV';
    const userKp = Keypair.random();
    const userAddress = userKp.publicKey();

    const contractAddress = new Address(contractId);
    const scKey = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol('Balance'),
      new Address(userAddress).toScVal(),
    ]);
    const scVal = xdr.ScVal.scvI128(
      new xdr.Int128Parts({
        lo: new xdr.Uint64(5000000),
        hi: new xdr.Int64(0),
      })
    );

    const contractData = new xdr.ContractDataEntry({
      contract: contractAddress.toScAddress(),
      key: scKey,
      durability: xdr.ContractDataDurability.persistent(),
      val: scVal,
      ext: new xdr.ExtensionPoint(0),
    });

    const entryData = xdr.LedgerEntryData.contractData(contractData);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          entries: [
            {
              xdr: entryData.toXDR('base64'),
              lastModifiedLedgerSeq: 105800,
            },
          ],
        },
      }),
    });

    const result = await handleReadStorage(
      {
        contractId,
        keyType: 'sac_balance',
        userAddress,
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.found).toBe(true);
    expect(result.decodedValue).toBe('5000000');
  });

  it('should return found false when storage entry is not present', async () => {
    const mockRpc = 'https://rpc.mock';
    const contractId = 'CDHOWHQVJQ3NJ2EGZPDGBR4PZ4HFRY3J7BMMZGNA5LUQRL4ZIZL7X5LV';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          entries: [],
        },
      }),
    });

    const result = await handleReadStorage(
      {
        contractId,
        key: 'nonexistent',
        keyType: 'symbol',
        network: 'testnet',
      },
      mockRpc
    );

    expect(result.found).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('should fetch and parse orderbook with bids, asks, spread, and depth', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockOrderbookResponse = {
      bids: [
        { price_r: { n: 27, d: 250 }, price: '0.1080000', amount: '64944.5984490' },
        { price_r: { n: 1, d: 10 }, price: '0.1000000', amount: '30.0000000' },
      ],
      asks: [
        { price_r: { n: 3, d: 25 }, price: '0.1200000', amount: '8.8719417' },
        { price_r: { n: 19, d: 40 }, price: '0.4750000', amount: '1.0000000' },
      ],
      base: { asset_type: 'native' },
      counter: {
        asset_type: 'credit_alphanum4',
        asset_code: 'USDC',
        asset_issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOrderbookResponse,
    });

    const result = await handleGetOrderbook(
      {
        sellingAsset: 'native',
        buyingAsset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
        limit: 20,
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.bestBid).toBe('0.1080000');
    expect(result.bestAsk).toBe('0.1200000');
    expect(result.spread).toBe('0.0120000');
    expect(result.spreadPercentage).toBe('11.1111%');
    expect(result.bidsCount).toBe(2);
    expect(result.asksCount).toBe(2);
    expect(result.base.asset_type).toBe('native');
  });

  it('should return validation error for malformed asset strings', async () => {
    const mockHorizon = 'https://horizon.mock';

    const result = await handleGetOrderbook(
      {
        sellingAsset: 'INVALID_ASSET_WITHOUT_ISSUER',
        buyingAsset: 'native',
        limit: 20,
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.error).toContain('Invalid sellingAsset format');
  });

  it('should fetch and parse liquidity pools by reserve assets', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockPoolsResponse = {
      _embedded: {
        records: [
          {
            id: '001041ac1d61419a62e0c0152e59f13aff7f8f65c2f04c1371ebbc662b31f4ab',
            fee_bp: 30,
            type: 'constant_product',
            total_trustlines: '5',
            total_shares: '353.5533905',
            reserves: [
              { asset: 'native', amount: '275.0000000' },
              { asset: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', amount: '450.0000000' },
            ],
            last_modified_ledger: 105990,
            last_modified_time: '2026-07-13T23:25:07Z',
            paging_token: '001041ac...',
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPoolsResponse,
    });

    const result = await handleGetLiquidityPools(
      {
        reserves: ['native', 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'],
        limit: 10,
        order: 'desc',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.count).toBe(1);
    expect(result.pools[0].id).toBe('001041ac1d61419a62e0c0152e59f13aff7f8f65c2f04c1371ebbc662b31f4ab');
    expect(result.pools[0].feeBp).toBe(30);
    expect(result.pools[0].totalShares).toBe('353.5533905');
    expect(result.pools[0].reserves).toHaveLength(2);
  });

  it('should fetch specific liquidity pool by pool ID', async () => {
    const mockHorizon = 'https://horizon.mock';
    const mockPool = {
      id: '001041ac1d61419a62e0c0152e59f13aff7f8f65c2f04c1371ebbc662b31f4ab',
      fee_bp: 30,
      type: 'constant_product',
      total_trustlines: '5',
      total_shares: '353.5533905',
      reserves: [
        { asset: 'native', amount: '275.0000000' },
      ],
      last_modified_ledger: 105990,
      last_modified_time: '2026-07-13T23:25:07Z',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPool,
    });

    const result = await handleGetLiquidityPools(
      {
        poolId: '001041ac1d61419a62e0c0152e59f13aff7f8f65c2f04c1371ebbc662b31f4ab',
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.id).toBe('001041ac1d61419a62e0c0152e59f13aff7f8f65c2f04c1371ebbc662b31f4ab');
    expect(result.feeBp).toBe(30);
  });

  it('should fetch and parse claimable balances by claimant', async () => {
    const mockHorizon = 'https://horizon.mock';
    const claimantAddress = 'GDSHZPWSL5QBQKKDQNECFPI2PF7JQUACNWG65PMFOK6G5V4QBH4CX2KH';
    const mockClaimableResponse = {
      _embedded: {
        records: [
          {
            id: '00000000075fa23e035da964f3f85009de47b381011e44d73c32012e2c56689b38fb816b',
            asset: 'native',
            amount: '25.0000000',
            sponsor: 'GA3AMQY5WWFUE3ZCN4XJOFT7QK7ZROMCJAEB2YZBVNONCHU272275UUD',
            claimants: [
              {
                destination: claimantAddress,
                predicate: { unconditional: true },
              },
            ],
            last_modified_ledger: 105990,
            last_modified_time: '2026-07-13T23:25:07Z',
            flags: { clawback_enabled: false },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockClaimableResponse,
    });

    const result = await handleGetClaimableBalances(
      {
        claimant: claimantAddress,
        limit: 10,
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.count).toBe(1);
    expect(result.records[0].id).toBe('00000000075fa23e035da964f3f85009de47b381011e44d73c32012e2c56689b38fb816b');
    expect(result.records[0].amount).toBe('25.0000000');
    expect(result.records[0].claimants[0].destination).toBe(claimantAddress);
  });

  it('should build unsigned claim transaction envelope when requested', async () => {
    const mockHorizon = 'https://horizon.mock';
    const kp = Keypair.random();
    const claimantAddress = kp.publicKey();
    const balanceId = '00000000075fa23e035da964f3f85009de47b381011e44d73c32012e2c56689b38fb816b';

    const mockSingleBalance = {
      id: balanceId,
      asset: 'native',
      amount: '50.0000000',
      sponsor: 'GA3AMQY5WWFUE3ZCN4XJOFT7QK7ZROMCJAEB2YZBVNONCHU272275UUD',
      claimants: [{ destination: claimantAddress, predicate: { unconditional: true } }],
      last_modified_ledger: 105990,
      last_modified_time: '2026-07-13T23:25:07Z',
      flags: { clawback_enabled: false },
    };

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/accounts/')) {
        return {
          ok: true,
          json: async () => ({ sequence: '1000' }),
        };
      }
      return {
        ok: true,
        json: async () => mockSingleBalance,
      };
    });

    const result = await handleGetClaimableBalances(
      {
        balanceId,
        claimant: claimantAddress,
        buildClaimEnvelope: true,
        network: 'testnet',
      },
      mockHorizon
    );

    expect(result.id).toBe(balanceId);
    expect(result.unsignedEnvelopeXdr).toBeDefined();
    expect(typeof result.unsignedEnvelopeXdr).toBe('string');
  });

  it('should fetch and parse full account details including sequence, signers, and thresholds', async () => {
    const mockHorizon = 'https://horizon.mock';
    const accountAddress = Keypair.random().publicKey();
    const signerAddress = Keypair.random().publicKey();
    const mockAccountData = {
      sequence: '1092837465',
      sequence_ledger: 839201,
      subentry_count: 3,
      inflation_destination: 'GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M',
      home_domain: 'example.org',
      last_modified_ledger: 839250,
      last_modified_time: '2026-08-15T12:00:00Z',
      thresholds: {
        low_threshold: 1,
        med_threshold: 2,
        high_threshold: 2,
      },
      flags: {
        auth_required: false,
        auth_revocable: false,
        auth_immutable: false,
        auth_clawback_enabled: false,
      },
      balances: [
        { asset_type: 'native', balance: '1000.5000000', buying_liabilities: '0.0000000', selling_liabilities: '0.0000000' },
        { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: 'GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M', balance: '250.0000000', limit: '10000.0000000', buying_liabilities: '0.0000000', selling_liabilities: '0.0000000' },
      ],
      signers: [
        { key: accountAddress, weight: 1, type: 'ed25519_public_key' },
        { key: signerAddress, weight: 1, type: 'ed25519_public_key' },
      ],
      num_sponsoring: 1,
      num_sponsored: 0,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAccountData,
    });

    const result = await handleGetAccountDetails(
      { accountAddress, network: 'testnet' },
      mockHorizon
    );

    expect(result.account).toBe(accountAddress);
    expect(result.sequence).toBe('1092837465');
    expect(result.subentryCount).toBe(3);
    expect(result.thresholds.med_threshold).toBe(2);
    expect(result.signers).toHaveLength(2);
    expect(result.signers[1].key).toBe(signerAddress);
    expect(result.balances).toHaveLength(2);
    expect(result.balances[0].asset).toBe('XLM');
    expect(result.balances[1].asset).toBe('USDC:GBTYXQONX2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S6VR2U3K5M');
  });

  it('should return error when account is not funded / not found (404)', async () => {
    const mockHorizon = 'https://horizon.mock';
    const accountAddress = Keypair.random().publicKey();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await handleGetAccountDetails(
      { accountAddress, network: 'testnet' },
      mockHorizon
    );

    expect(result.error).toBe('Account not funded / not found on ledger');
  });

  it('should return error when Horizon responds with 500 server error', async () => {
    const mockHorizon = 'https://horizon.mock';
    const accountAddress = Keypair.random().publicKey();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const result = await handleGetAccountDetails(
      { accountAddress, network: 'testnet' },
      mockHorizon
    );

    expect(result.error).toBe('Horizon error: Internal Server Error');
  });
});
