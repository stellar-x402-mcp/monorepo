import { Keypair } from '@stellar/stellar-sdk';
import chalk from 'chalk';

export async function generateWallet(): Promise<{ publicKey: string; secret: string }> {
  const pair = Keypair.random();
  console.log(chalk.bold.green('\nGenerated Fresh Ed25519 Stellar Keypair:'));
  console.log(chalk.bold('Public Key (G...): ') + chalk.yellow(pair.publicKey()));
  console.log(chalk.bold('Secret Key (S...): ') + chalk.red(pair.secret()));
  console.log(chalk.gray('\nStore your secret seed in an encrypted vault or local .env file.'));
  return { publicKey: pair.publicKey(), secret: pair.secret() };
}

export async function fundWallet(publicKey: string): Promise<boolean> {
  console.log(chalk.cyan(`\nRequesting Friendbot funding for ${publicKey}...`));
  try {
    const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
    if (res.ok) {
      console.log(chalk.bold.green('Successfully funded testnet account with 10,000 XLM!'));
      console.log(
        chalk.blue(`Explorer: https://stellar.expert/explorer/testnet/account/${publicKey}`)
      );
      return true;
    } else {
      const errText = await res.text();
      console.error(chalk.red(`Friendbot error: ${errText}`));
      return false;
    }
  } catch (err: any) {
    console.error(chalk.red(`Network failure requesting Friendbot: ${err.message}`));
    return false;
  }
}
