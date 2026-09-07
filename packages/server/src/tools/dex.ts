import { z } from 'zod';

export const GetOrderbookSchema = z.object({
  sellingAsset: z.string().describe('Asset being sold: "native" or "CODE:ISSUER"'),
  buyingAsset: z.string().describe('Asset being bought: "native" or "CODE:ISSUER"'),
  limit: z.number().int().positive().max(200).default(20).describe('Maximum orderbook depth (1 to 200)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

function parseAsset(assetStr: string, prefix: 'selling' | 'buying', searchParams: URLSearchParams): string | null {
  if (assetStr === 'native' || assetStr.toLocaleUpperCase() === 'XLM') {
    searchParams.set(`${prefix}_asset_type`, 'native');
    return null;
  }

  const parts = assetStr.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return `Invalid ${prefix}Asset format. Must be "native" or "CODE:ISSUER"`;
  }

  const [code, issuer] = parts;
  const assetType = code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12';
  searchParams.set(`${prefix}_asset_type`, assetType);
  searchParams.set(`${prefix}_asset_code`, code);
  searchParams.set(`${prefix}_asset_issuer`, issuer);
  return null;
}

export async function handleGetOrderbook(
  args: z.infer<typeof GetOrderbookSchema>,
  horizonUrl: string
) {
  try {
    const url = new URL(`${horizonUrl}/order_book`);
    const sellErr = parseAsset(args.sellingAsset, 'selling', url.searchParams);
    if (sellErr) return { error: sellErr };

    const buyErr = parseAsset(args.buyingAsset, 'buying', url.searchParams);
    if (buyErr) return { error: buyErr };

    url.searchParams.set('limit', String(args.limit));

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      return { error: `Horizon error (${res.status}): ${errText}` };
    }

    const data: any = await res.json();
    const bids = data.bids || [];
    const asks = data.asks || [];

    const bestBid = bids.length > 0 ? bids[0].price : null;
    const bestAsk = asks.length > 0 ? asks[0].price : null;

    let spread: string | null = null;
    let spreadPercentage: string | null = null;

    if (bestBid !== null && bestAsk !== null) {
      const bidNum = Number(bestBid);
      const askNum = Number(bestAsk);
      if (!isNaN(bidNum) && !isNaN(askNum)) {
        const spreadNum = askNum - bidNum;
        spread = spreadNum.toFixed(7);
        if (bidNum > 0) {
          spreadPercentage = ((spreadNum / bidNum) * 100).toFixed(4) + '%';
        }
      }
    }

    return {
      sellingAsset: args.sellingAsset,
      buyingAsset: args.buyingAsset,
      bestBid,
      bestAsk,
      spread,
      spreadPercentage,
      bidsCount: bids.length,
      asksCount: asks.length,
      bids,
      asks,
      base: data.base,
      counter: data.counter,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export const GetLiquidityPoolsSchema = z.object({
  poolId: z.string().optional().describe('Specific 64-character hex liquidity pool ID to query'),
  reserves: z.array(z.string()).optional().describe('Filter pools by comma-separated reserve assets ("native" or "CODE:ISSUER")'),
  account: z.string().min(56).max(56).optional().describe('Filter pools where account holds shares (G...)'),
  cursor: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().positive().max(200).default(20).describe('Maximum number of pools to return (1 to 200)'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleGetLiquidityPools(
  args: z.infer<typeof GetLiquidityPoolsSchema>,
  horizonUrl: string
) {
  try {
    let urlStr: string;

    if (args.poolId) {
      urlStr = `${horizonUrl}/liquidity_pools/${args.poolId}`;
      const res = await fetch(urlStr);
      if (!res.ok) {
        const errText = await res.text();
        return { error: `Horizon error (${res.status}): ${errText}` };
      }
      const pool: any = await res.json();
      return {
        id: pool.id,
        feeBp: pool.fee_bp,
        type: pool.type,
        totalTrustlines: pool.total_trustlines,
        totalShares: pool.total_shares,
        reserves: pool.reserves,
        lastModifiedLedger: pool.last_modified_ledger,
        lastModifiedTime: pool.last_modified_time,
      };
    }

    if (args.account) {
      urlStr = `${horizonUrl}/accounts/${args.account}/liquidity_pools`;
    } else {
      urlStr = `${horizonUrl}/liquidity_pools`;
    }

    const url = new URL(urlStr);
    url.searchParams.set('limit', String(args.limit));
    url.searchParams.set('order', args.order);
    if (args.cursor) {
      url.searchParams.set('cursor', args.cursor);
    }
    if (args.reserves && args.reserves.length > 0) {
      url.searchParams.set('reserves', args.reserves.join(','));
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      return { error: `Horizon error (${res.status}): ${errText}` };
    }

    const data: any = await res.json();
    const records = data._embedded?.records || [];

    const pools = records.map((pool: any) => ({
      id: pool.id,
      feeBp: pool.fee_bp,
      type: pool.type,
      totalTrustlines: pool.total_trustlines,
      totalShares: pool.total_shares,
      reserves: pool.reserves,
      lastModifiedLedger: pool.last_modified_ledger,
      lastModifiedTime: pool.last_modified_time,
      pagingToken: pool.paging_token,
    }));

    return {
      count: pools.length,
      pools,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
