import { Horizon, rpc } from '@stellar/stellar-sdk';
import chalk from 'chalk';

export interface InspectOptions {
  network?: 'testnet' | 'pubnet' | undefined;
  horizonUrl?: string | undefined;
  rpcUrl?: string | undefined;
}

export async function runInspect(target: string, options: InspectOptions = {}): Promise<void> {
  const network = options.network || 'testnet';
  const horizonUrl =
    options.horizonUrl ||
    (network === 'pubnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org');

  const rpcUrl =
    options.rpcUrl ||
    (network === 'pubnet'
      ? 'https://mainnet.sorobanrpc.com'
      : 'https://soroban-testnet.stellar.org');

  console.log(chalk.bold.cyan(`\n🔍 Inspecting target: ${target}`));
  console.log(chalk.gray(`Network: ${network} | Horizon: ${horizonUrl}\n`));

  if (target.startsWith('C')) {
    // Soroban Contract Inspection
    console.log(chalk.yellow(`Detected Soroban Contract ID: ${target}`));
    const server = new rpc.Server(rpcUrl);

    try {
      const latestLedger = await server.getLatestLedger();
      console.log(chalk.green(`Latest Soroban Ledger: ${latestLedger.sequence}`));
      console.log(chalk.blue(`Stellar Expert Explorer:`));
      console.log(
        chalk.underline(`https://stellar.expert/explorer/${network}/contract/${target}`)
      );
    } catch (err: any) {
      console.error(chalk.red(`Failed to query Soroban RPC: ${err.message}`));
    }
  } else if (target.startsWith('G')) {
    // Stellar Classic Account Inspection
    const horizon = new Horizon.Server(horizonUrl);

    try {
      const account = await horizon.loadAccount(target);
      console.log(chalk.green(`Sequence: ${account.sequence}`));
      console.log(chalk.green(`Subentry Count: ${account.subentry_count}`));
      console.log(chalk.bold('\nBalances:'));

      for (const b of account.balances) {
        if (b.asset_type === 'native') {
          console.log(chalk.yellow(`  • XLM (Native): ${b.balance}`));
        } else if (b.asset_type === 'liquidity_pool_shares') {
          console.log(chalk.magenta(`  • Liquidity Pool: ${b.balance} (Pool ID: ${b.liquidity_pool_id})`));
        } else {
          console.log(chalk.white(`  • ${b.asset_code}:${b.asset_issuer}: ${b.balance}`));
        }
      }

      console.log(chalk.blue(`\nStellar Expert Explorer:`));
      console.log(
        chalk.underline(`https://stellar.expert/explorer/${network}/account/${target}`)
      );
    } catch (err: any) {
      console.error(chalk.red(`Failed to load account from Horizon: ${err.message}`));
    }
  } else {
    console.error(
      chalk.red(`Invalid address format: Must start with G (account) or C (contract)`)
    );
  }
}
