import dotenv from 'dotenv';
dotenv.config();

export interface TradingAgentConfig {
  network: 'testnet' | 'pubnet';
  agentSecretKey?: string | undefined;
  dailyBudgetUsdc: number;
  maxPaymentPerInvocation: number;
  baseAsset: string;
  quoteAsset: string;
  minProfitBps: number;
  maxTradeAmount: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  pollIntervalMs: number;
}

export const defaultAgentConfig: TradingAgentConfig = {
  network: (process.env.STELLAR_NETWORK as 'testnet' | 'pubnet') || 'testnet',
  agentSecretKey: process.env.AGENT_SECRET_KEY,
  dailyBudgetUsdc: parseFloat(process.env.AGENT_DAILY_BUDGET || '5.0'),
  maxPaymentPerInvocation: parseFloat(process.env.AGENT_MAX_PER_CALL || '0.05'),
  baseAsset: process.env.AGENT_BASE_ASSET || 'native',
  quoteAsset:
    process.env.AGENT_QUOTE_ASSET ||
    'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  minProfitBps: parseInt(process.env.AGENT_MIN_PROFIT_BPS || '50', 10),
  maxTradeAmount: process.env.AGENT_MAX_TRADE_AMOUNT || '10.0',
  horizonUrl:
    process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
  sorobanRpcUrl:
    process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
  pollIntervalMs: parseInt(process.env.AGENT_POLL_INTERVAL_MS || '5000', 10),
};
