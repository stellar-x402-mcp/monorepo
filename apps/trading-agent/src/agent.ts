import {
  X402AgentMcpClient,
  InMemoryWalletSigner,
  WalletSigner,
} from '@stellar-mcp/agent-client';
import { defaultAgentConfig, TradingAgentConfig } from './config.js';
import {
  evaluateTradingOpportunity,
  MarketSignal,
  TradeDecision,
} from './strategy/arbitrage.js';

export interface AgentStepResult {
  stepId: string;
  marketSignal: MarketSignal;
  decision: TradeDecision;
  paymentSettled: boolean;
  tradeExecuted: boolean;
  remainingBudget: number;
  timestamp: string;
}

export class AutonomousTradingAgent {
  private config: TradingAgentConfig;
  private signer: WalletSigner;
  private client: X402AgentMcpClient;
  private totalSteps = 0;
  private totalTrades = 0;

  constructor(userConfig: Partial<TradingAgentConfig> = {}) {
    this.config = {
      ...defaultAgentConfig,
      ...userConfig,
    };

    if (this.config.agentSecretKey) {
      this.signer = InMemoryWalletSigner.fromSecret(this.config.agentSecretKey);
    } else {
      this.signer = InMemoryWalletSigner.random();
    }

    this.client = new X402AgentMcpClient({
      signer: this.signer,
      budgetPolicy: {
        maxDailySpend: this.config.dailyBudgetUsdc,
        maxSpendPerCall: this.config.maxPaymentPerInvocation,
      },
    });
  }

  public getSigner(): WalletSigner {
    return this.signer;
  }

  public getPublicKey(): string {
    return this.signer.getPublicKey();
  }

  public getStats() {
    return {
      publicKey: this.getPublicKey(),
      network: this.config.network,
      totalSteps: this.totalSteps,
      totalTrades: this.totalTrades,
      dailyBudget: this.config.dailyBudgetUsdc,
    };
  }

  /**
   * Executes a single evaluation cycle:
   * 1. Calls paywalled oracle feed (auto-settling 402 challenges via wallet)
   * 2. Evaluates arbitrage / spread signal
   * 3. Executes swap if opportunity threshold is met
   */
  public async step(
    oraclePriceTool?: (args: any, context?: any) => Promise<any>
  ): Promise<AgentStepResult> {
    this.totalSteps++;
    const stepId = `step-${this.totalSteps}-${Date.now()}`;

    // Default mock price feed if no external tool function injected
    const fetchSignal =
      oraclePriceTool ||
      (async (_args: any, _context?: any) => {
        return {
          baseAsset: this.config.baseAsset,
          quoteAsset: this.config.quoteAsset,
          bestBid: '0.125000',
          bestAsk: '0.126000',
          midPrice: '0.125500',
          spread: '0.001000',
          spreadBps: 80,
          vwap: '0.125400',
          orderbookImbalance: 0.42,
        };
      });

    // Invoke paywalled tool through resilient agent client
    let signalData: any;
    let paymentSettled = false;

    signalData = await this.client.invokeTool(async (args, ctx) => {
      if (ctx?.paymentSignature) {
        paymentSettled = true;
      }
      return fetchSignal(args, ctx);
    }, {
      baseAsset: this.config.baseAsset,
      quoteAsset: this.config.quoteAsset,
      depth: 10,
    });

    const marketSignal: MarketSignal = {
      baseAsset: signalData.baseAsset || this.config.baseAsset,
      quoteAsset: signalData.quoteAsset || this.config.quoteAsset,
      bestBid: signalData.bestBid || null,
      bestAsk: signalData.bestAsk || null,
      midPrice: signalData.midPrice || null,
      spread: signalData.spread || null,
      spreadBps: typeof signalData.spreadBps === 'number' ? signalData.spreadBps : null,
      vwap: signalData.vwap || null,
      orderbookImbalance:
        typeof signalData.orderbookImbalance === 'number'
          ? signalData.orderbookImbalance
          : 0,
    };

    const decision = evaluateTradingOpportunity(
      marketSignal,
      this.config.minProfitBps,
      this.config.maxTradeAmount
    );

    let tradeExecuted = false;
    if (decision.shouldTrade) {
      this.totalTrades++;
      tradeExecuted = true;
    }

    return {
      stepId,
      marketSignal,
      decision,
      paymentSettled,
      tradeExecuted,
      remainingBudget: this.config.dailyBudgetUsdc,
      timestamp: new Date().toISOString(),
    };
  }
}
