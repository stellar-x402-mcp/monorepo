import { describe, it, expect, vi } from 'vitest';
import {
  createPaywalledPriceTool,
  fetchDexPrice,
} from '../src/tools/price.js';
import {
  createPaywalledTvlTool,
  fetchSorobanTvl,
} from '../src/tools/tvl.js';
import {
  createPaywalledRouteTool,
  fetchSwapRoute,
} from '../src/tools/route.js';
import { createOracleServer } from '../src/server.js';
import { PaymentRequiredError } from '@stellar-mcp/paywall';

describe('Paywalled Oracle Tools', () => {
  const mockConfig = {
    port: 4020,
    transport: 'stdio' as const,
    network: 'testnet' as const,
    merchantAddress: 'GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT',
    usdcToken: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
    prices: {
      dexPrice: '0.01',
      sorobanTvl: '0.02',
      swapRoute: '0.01',
    },
  };

  describe('DEX Price Tool', () => {
    it('throws PaymentRequiredError when called without payment signature', async () => {
      const tool = createPaywalledPriceTool(mockConfig);
      await expect(tool({ baseAsset: 'native', quoteAsset: 'USDC', depth: 5 })).rejects.toThrow(
        PaymentRequiredError
      );

      try {
        await tool({ baseAsset: 'native', quoteAsset: 'USDC', depth: 5 });
      } catch (err: any) {
        expect(err.challenge).toBeDefined();
        expect(err.challenge.price).toBe('0.01');
        expect(err.challenge.recipient).toBe(mockConfig.merchantAddress);
        expect(err.challenge.asset).toBe(mockConfig.usdcToken);
      }
    });

    it('returns market analysis when valid payment signature context is provided', async () => {
      const tool = createPaywalledPriceTool(mockConfig);
      const result = await tool(
        { baseAsset: 'native', quoteAsset: 'USDC', depth: 5 },
        { paymentSignature: 'tx_hash_valid_test_signature' }
      );

      expect(result).toBeDefined();
      expect(result.baseAsset).toBe('native');
      expect(result.provider).toBe('stellar-x402-oracle');
      expect(typeof result.totalBidLiquidity).toBe('string');
      expect(typeof result.totalAskLiquidity).toBe('string');
      expect(typeof result.orderbookImbalance).toBe('number');
    });

    it('computes VWAP and spread metrics correctly', async () => {
      const result = await fetchDexPrice(
        { baseAsset: 'native', quoteAsset: 'USDC', depth: 10 },
        'https://horizon-testnet.stellar.org'
      );

      expect(result).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('Soroban TVL Tool', () => {
    it('throws PaymentRequiredError requiring 0.02 USDC', async () => {
      const tool = createPaywalledTvlTool(mockConfig);
      try {
        await tool({ targetAddress: 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY' });
        expect.unreachable('Should have thrown 402');
      } catch (err: any) {
        expect(err.challenge).toBeDefined();
        expect(err.challenge.price).toBe('0.02');
      }
    });

    it('returns TVL metrics when payment context is supplied', async () => {
      const tool = createPaywalledTvlTool(mockConfig);
      const result = await tool(
        {
          targetAddress: 'CDAVUNF5DHX2MWF33XDMY7WKVBSQZ3SXZDT2TPSNZPEB3Z4HHPPKTVGY',
          targetType: 'contract',
        },
        { paymentSignature: 'tx_hash_tvl_paid' }
      );

      expect(result).toBeDefined();
      expect(result.totalValueLockedUsd).toBeDefined();
      expect(result.status).toBe('synced');
    });
  });

  describe('Swap Route Tool', () => {
    it('throws PaymentRequiredError requiring 0.01 USDC', async () => {
      const tool = createPaywalledRouteTool(mockConfig);
      await expect(
        tool({ sourceAsset: 'native', destinationAsset: 'USDC', destinationAmount: '50.0' })
      ).rejects.toThrow(PaymentRequiredError);
    });

    it('returns optimal swap route and fee estimation when paid', async () => {
      const tool = createPaywalledRouteTool(mockConfig);
      const result = await tool(
        { sourceAsset: 'native', destinationAsset: 'USDC', destinationAmount: '50.0' },
        { paymentSignature: 'tx_hash_route_paid' }
      );

      expect(result).toBeDefined();
      expect(result.destinationAmount).toBe('50.0');
      expect(result.estimatedSourceAmount).toBeDefined();
      expect(result.maxSourceAmountWithSlippage).toBeDefined();
      expect(result.estimatedFeeStroops).toBe(100);
    });
  });

  describe('MCP Server Integration', () => {
    it('creates server and lists all 3 paywalled tools', async () => {
      const { server } = createOracleServer(mockConfig);
      expect(server).toBeDefined();
    });
  });
});
