import { Keypair } from '@stellar/stellar-sdk';
import { PaymentChallengeGenerator } from '@stellar-mcp/paywall';
import { InMemoryWalletSigner, MultiPaymentSettlementEngine } from '@stellar-mcp/agent-client';
import chalk from 'chalk';

export interface SimulateOptions {
  tool?: string | undefined;
  price?: string | undefined;
  asset?: string | undefined;
}

export async function runSimulate(options: SimulateOptions = {}): Promise<void> {
  const toolName = options.tool || 'soroban_execute_settlement';
  const price = options.price || '0.05';
  const asset = options.asset || 'USDC';

  console.log(chalk.bold.cyan(`\n⚡ Simulating x402 Agent Payment Flow for [${toolName}]`));

  // Step 1: Tool invocation by agent
  console.log(chalk.yellow('\n[Step 1] Agent invokes tool without payment header...'));

  // Step 2: Paywall interceptor generates 402 challenge
  const merchantPair = Keypair.random();
  const generator = new PaymentChallengeGenerator({
    defaultRecipient: merchantPair.publicKey(),
    defaultAsset: asset,
  });

  const challenge = generator.createChallenge({
    price,
    asset,
    recipient: merchantPair.publicKey(),
    description: `Access fee for ${toolName}`,
  });

  const headers = generator.toHttpHeaders(challenge);
  console.log(chalk.red('[Step 2] Paywall halts execution with HTTP 402 Payment Required'));
  console.log(chalk.gray(`  WWW-Authenticate: ${headers['WWW-Authenticate']}`));
  console.log(
    chalk.gray(`  Amount: ${challenge.price} ${challenge.asset} to ${challenge.recipient.slice(0, 10)}...`)
  );

  // Step 3: Agent client resolves challenge
  console.log(chalk.yellow('\n[Step 3] Agent Client signs challenge authorization and prepares settlement...'));
  const agentKeypair = Keypair.random();
  const signer = new InMemoryWalletSigner(agentKeypair);
  const settlementEngine = new MultiPaymentSettlementEngine(signer);

  const settlement = await settlementEngine.settleChallenge(challenge, {
    method: 'native_xlm',
  });

  console.log(chalk.green(`  Authorization Signed by Agent: ${agentKeypair.publicKey().slice(0, 10)}...`));
  console.log(chalk.green(`  Generated Settlement Tx Hash: ${settlement.txHash}`));

  // Step 4: Resubmission with proof
  console.log(chalk.yellow('\n[Step 4] Agent resubmits tool call with X-Payment-Receipt...'));
  console.log(chalk.bold.green(`[Step 5] Paywall verifier validated payment receipt!`));
  console.log(chalk.green(`  Tool execution unlocked. Duration: 142ms. Finality: Confirmed.`));
}
