import { describe, it, expect } from 'vitest';
import { AutonomousTradingAgent } from '../src/agent.js';
import { evaluateTradingOpportunity, MarketSignal } from '../src/strategy/arbitrage.js';
import { PaymentRequiredError } from '@stellar-mcp/paywall';

describe('Autonomous Trading Agent', () => {
  it('initializes agent with generated Ed25519 keypair and budget caps', () => {
    const agent = new AutonomousTradingAgent({
      dailyBudgetUsdc: 10.0,
      maxPaymentPerInvocation: 0.05,
    });

    const stats = agent.getStats();
    expect(stats.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
    expect(stats.dailyBudget).toBe(10.0);
    expect(stats.totalSteps).toBe(0);
  });

  describe('Arbitrage Strategy Evaluation', () => {
    it('triggers BUY when orderbook imbalance is strongly positive with sufficient spread', () => {
      const signal: MarketSignal = {
        baseAsset: 'native',
        quoteAsset: 'USDC',
        bestBid: '0.120000',
        bestAsk: '0.121000',
        midPrice: '0.120500',
        spread: '0.001000',
        spreadBps: 83,
        vwap: '0.120600',
        orderbookImbalance: 0.45,
      };

      const decision = evaluateTradingOpportunity(signal, 50, '25.0');
      expect(decision.shouldTrade).toBe(true);
      expect(decision.action).toBe('BUY');
      expect(decision.targetAmount).toBe('25.0');
      expect(decision.estimatedReturnBps).toBe(83);
    });

    it('triggers SELL when orderbook imbalance is strongly negative with sufficient spread', () => {
      const signal: MarketSignal = {
        baseAsset: 'native',
        quoteAsset: 'USDC',
        bestBid: '0.120000',
        bestAsk: '0.121000',
        midPrice: '0.120500',
        spread: '0.001000',
        spreadBps: 83,
        vwap: '0.120400',
        orderbookImbalance: -0.48,
      };

      const decision = evaluateTradingOpportunity(signal, 50, '15.0');
      expect(decision.shouldTrade).toBe(true);
      expect(decision.action).toBe('SELL');
      expect(decision.targetAmount).toBe('15.0');
    });

    it('triggers HOLD when spread is below minimum basis points threshold', () => {
      const signal: MarketSignal = {
        baseAsset: 'native',
        quoteAsset: 'USDC',
        bestBid: '0.120000',
        bestAsk: '0.120200',
        midPrice: '0.120100',
        spread: '0.000200',
        spreadBps: 16,
        vwap: '0.120100',
        orderbookImbalance: 0.60,
      };

      const decision = evaluateTradingOpportunity(signal, 50, '10.0');
      expect(decision.shouldTrade).toBe(false);
      expect(decision.action).toBe('HOLD');
    });
  });

  describe('Automated 402 Paywall Negotiation', () => {
    it('intercepts 402 challenge, signs authorization, and retries payment context', async () => {
      const agent = new AutonomousTradingAgent({
        dailyBudgetUsdc: 5.0,
        maxPaymentPerInvocation: 0.05,
      });

      let callCount = 0;
      const mockPaywalledTool = async (_args: any, context?: any) => {
        callCount++;
        if (!context?.paymentSignature) {
          throw new PaymentRequiredError({
            version: 'x402-v1',
            network: 'stellar:testnet',
            asset: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC',
            price: '0.01',
            recipient: 'GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT',
            validUntil: Math.floor(Date.now() / 1000) + 300,
          });
        }

        return {
          baseAsset: 'native',
          quoteAsset: 'USDC',
          bestBid: '0.120000',
          bestAsk: '0.121000',
          midPrice: '0.120500',
          spread: '0.001000',
          spreadBps: 83,
          vwap: '0.120600',
          orderbookImbalance: 0.45,
        };
      };

      const stepResult = await agent.step(mockPaywalledTool);
      expect(callCount).toBe(2);
      expect(stepResult.paymentSettled).toBe(true);
      expect(stepResult.decision.action).toBe('BUY');
    });

    it('rejects invocation when paywall price exceeds budget cap', async () => {
      const agent = new AutonomousTradingAgent({
        dailyBudgetUsdc: 0.005,
        maxPaymentPerInvocation: 0.005,
      });

      const expensiveTool = async (_args: any, context?: any) => {
        if (!context?.paymentSignature) {
          throw new PaymentRequiredError({
            version: 'x402-v1',
            network: 'stellar:testnet',
            asset: 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWUIE3USSTHZX5ACUSDC',
            price: '0.05',
            recipient: 'GAIA4ZKABJY2A33LWMTLH5ZXIQBMB7SVLZWIMGP3QA633TCY7WAHYAMT',
            validUntil: Math.floor(Date.now() / 1000) + 300,
          });
        }
        return {};
      };

      await expect(agent.step(expensiveTool)).rejects.toThrow(/Budget exceeded/);
    });
  });
});
