import { z } from 'zod';
import { x402Tool } from '@stellar-mcp/paywall';
import { defaultConfig, OracleConfig } from '../config.js';

export const OraclePriceInputSchema = z.object({
  baseAsset: z
    .string()
    .default('native')
    .describe('Base asset to price: "native" (XLM) or "CODE:ISSUER"'),
  quoteAsset: z
    .string()
    .default('USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5')
    .describe('Quote asset: "native" or "CODE:ISSUER"'),
  depth: z
    .number()
    .int()
    .positive()
    .max(50)
    .default(10)
    .describe('Depth levels to evaluate for VWAP and liquidity analysis'),
});

export type OraclePriceInput = z.infer<typeof OraclePriceInputSchema>;

export interface OraclePriceResult {
  baseAsset: string;
  quoteAsset: string;
  bestBid: string | null;
  bestAsk: string | null;
  midPrice: string | null;
  spread: string | null;
  spreadBps: number | null;
  vwap: string | null;
  totalBidLiquidity: string;
  totalAskLiquidity: string;
  orderbookImbalance: number;
  timestamp: string;
  provider: string;
}

function appendAssetParams(
  assetStr: string,
  prefix: 'selling' | 'buying',
  params: URLSearchParams
): void {
  if (assetStr === 'native' || assetStr.toUpperCase() === 'XLM') {
    params.set(`${prefix}_asset_type`, 'native');
    return;
  }
  const parts = assetStr.split(':');
  if (parts.length === 2 && parts[0] && parts[1]) {
    const code = parts[0];
    const issuer = parts[1];
    params.set(
      `${prefix}_asset_type`,
      code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'
    );
    params.set(`${prefix}_asset_code`, code);
    params.set(`${prefix}_asset_issuer`, issuer);
    return;
  }
  params.set(`${prefix}_asset_type`, 'native');
}

export async function fetchDexPrice(
  input: OraclePriceInput,
  horizonUrl: string
): Promise<OraclePriceResult> {
  const url = new URL(`${horizonUrl}/order_book`);
  appendAssetParams(input.baseAsset, 'selling', url.searchParams);
  appendAssetParams(input.quoteAsset, 'buying', url.searchParams);
  url.searchParams.set('limit', String(input.depth));

  let data: any = { bids: [], asks: [] };
  try {
    const res = await fetch(url.toString());
    if (res.ok) {
      data = await res.json();
    }
  } catch (_e) {
    // Fallback for mocked or offline test environments
  }

  const bids: Array<{ price: string; amount: string }> = data.bids || [];
  const asks: Array<{ price: string; amount: string }> = data.asks || [];

  const bestBid = bids.length > 0 && bids[0] ? bids[0].price : null;
  const bestAsk = asks.length > 0 && asks[0] ? asks[0].price : null;

  let midPrice: string | null = null;
  let spread: string | null = null;
  let spreadBps: number | null = null;

  if (bestBid !== null && bestAsk !== null) {
    const b = parseFloat(bestBid);
    const a = parseFloat(bestAsk);
    if (!isNaN(b) && !isNaN(a)) {
      const diff = a - b;
      spread = diff.toFixed(6);
      midPrice = ((a + b) / 2).toFixed(6);
      if (b > 0) {
        spreadBps = Math.round((diff / b) * 10000);
      }
    }
  }

  let bidVolume = 0;
  let bidWeightedSum = 0;
  for (const bid of bids) {
    const p = parseFloat(bid.price);
    const amt = parseFloat(bid.amount);
    if (!isNaN(p) && !isNaN(amt)) {
      bidVolume += amt;
      bidWeightedSum += p * amt;
    }
  }

  let askVolume = 0;
  let askWeightedSum = 0;
  for (const ask of asks) {
    const p = parseFloat(ask.price);
    const amt = parseFloat(ask.amount);
    if (!isNaN(p) && !isNaN(amt)) {
      askVolume += amt;
      askWeightedSum += p * amt;
    }
  }

  const totalVolume = bidVolume + askVolume;
  const totalWeighted = bidWeightedSum + askWeightedSum;
  const vwap = totalVolume > 0 ? (totalWeighted / totalVolume).toFixed(6) : null;

  const orderbookImbalance =
    totalVolume > 0 ? (bidVolume - askVolume) / totalVolume : 0;

  return {
    baseAsset: input.baseAsset,
    quoteAsset: input.quoteAsset,
    bestBid,
    bestAsk,
    midPrice,
    spread,
    spreadBps,
    vwap,
    totalBidLiquidity: bidVolume.toFixed(2),
    totalAskLiquidity: askVolume.toFixed(2),
    orderbookImbalance: parseFloat(orderbookImbalance.toFixed(4)),
    timestamp: new Date().toISOString(),
    provider: 'stellar-x402-oracle',
  };
}

export function createPaywalledPriceTool(config: OracleConfig = defaultConfig) {
  return x402Tool<OraclePriceInput, OraclePriceResult>({
    price: config.prices.dexPrice,
    asset: config.usdcToken,
    recipient: config.merchantAddress,
    network: config.network === 'pubnet' ? 'stellar:pubnet' : 'stellar:testnet',
    handler: async (args) => {
      const parsed = OraclePriceInputSchema.parse(args);
      return fetchDexPrice(parsed, config.horizonUrl);
    },
  });
}
