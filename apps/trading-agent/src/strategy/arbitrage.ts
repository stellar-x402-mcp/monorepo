export interface MarketSignal {
  baseAsset: string;
  quoteAsset: string;
  bestBid: string | null;
  bestAsk: string | null;
  midPrice: string | null;
  spread: string | null;
  spreadBps: number | null;
  vwap: string | null;
  orderbookImbalance: number;
}

export interface TradeDecision {
  shouldTrade: boolean;
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  targetAmount: string;
  estimatedReturnBps: number;
  limitPrice: string | null;
}

export function evaluateTradingOpportunity(
  signal: MarketSignal,
  minProfitBps: number,
  maxTradeAmount: string
): TradeDecision {
  if (!signal.bestBid || !signal.bestAsk || signal.spreadBps === null) {
    return {
      shouldTrade: false,
      action: 'HOLD',
      reason: 'Insufficient orderbook depth or missing pricing feeds',
      targetAmount: '0',
      estimatedReturnBps: 0,
      limitPrice: null,
    };
  }

  // Significant positive buy imbalance (excess bid pressure suggests upward price drift)
  if (signal.orderbookImbalance > 0.35 && signal.spreadBps >= minProfitBps) {
    return {
      shouldTrade: true,
      action: 'BUY',
      reason: `Strong bid imbalance (${(signal.orderbookImbalance * 100).toFixed(1)}%) with spread of ${signal.spreadBps} bps`,
      targetAmount: maxTradeAmount,
      estimatedReturnBps: signal.spreadBps,
      limitPrice: signal.bestAsk,
    };
  }

  // Significant negative sell imbalance (excess ask pressure suggests downward price drift)
  if (signal.orderbookImbalance < -0.35 && signal.spreadBps >= minProfitBps) {
    return {
      shouldTrade: true,
      action: 'SELL',
      reason: `Strong ask imbalance (${(signal.orderbookImbalance * 100).toFixed(1)}%) with spread of ${signal.spreadBps} bps`,
      targetAmount: maxTradeAmount,
      estimatedReturnBps: signal.spreadBps,
      limitPrice: signal.bestBid,
    };
  }

  return {
    shouldTrade: false,
    action: 'HOLD',
    reason: `Orderbook spread (${signal.spreadBps} bps) does not meet threshold or imbalance is neutral (${(signal.orderbookImbalance * 100).toFixed(1)}%)`,
    targetAmount: '0',
    estimatedReturnBps: signal.spreadBps || 0,
    limitPrice: signal.midPrice,
  };
}
