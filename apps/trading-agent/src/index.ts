import { AutonomousTradingAgent } from './agent.js';
import { defaultAgentConfig, TradingAgentConfig } from './config.js';

export * from './config.js';
export * from './agent.js';
export * from './strategy/arbitrage.js';

export async function runTradingAgent(userConfig: Partial<TradingAgentConfig> = {}) {
  const agent = new AutonomousTradingAgent(userConfig);
  const stats = agent.getStats();

  console.log('[trading-agent] Initialized Autonomous Trading Agent');
  console.log(`[trading-agent] Agent Public Key: ${stats.publicKey}`);
  console.log(`[trading-agent] Network: ${stats.network}`);
  console.log(`[trading-agent] Daily Budget: ${stats.dailyBudget} USDC`);

  // Run initial test step
  const result = await agent.step();
  console.log(`[trading-agent] Cycle executed: ${result.stepId}`);
  console.log(`[trading-agent] Decision: ${result.decision.action} (${result.decision.reason})`);

  return { agent, result };
}

// Auto-run if executed directly as script
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('index.js') ||
    process.argv[1].endsWith('stellar-trading-agent'));

if (isMain) {
  runTradingAgent().catch((err) => {
    console.error('[trading-agent] Fatal execution error:', err);
    process.exit(1);
  });
}
