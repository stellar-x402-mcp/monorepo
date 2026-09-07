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
