import { Command } from 'commander';
import { runServe } from './commands/serve.js';
import { runInspect } from './commands/inspect.js';
import { generateWallet, fundWallet } from './commands/wallet.js';
import { runSimulate } from './commands/simulate.js';
import { runBenchmark } from './commands/benchmark.js';

const program = new Command();

program
  .name('stellar-mcp')
  .description('Production CLI for Stellar x402 Model Context Protocol servers and agent tools')
  .version('0.1.0');

program
  .command('serve')
  .description('Run the Stellar MCP server')
  .option('-t, --transport <transport>', 'Transport protocol: stdio or sse', 'stdio')
  .option('-n, --network <network>', 'Stellar network: testnet or pubnet', 'testnet')
  .option('-p, --port <port>', 'HTTP/SSE server port', '3000')
  .option('--auth-token <token>', 'Bearer token for remote SSE authorization')
  .option('--horizon-url <url>', 'Custom Horizon URL')
  .option('--rpc-url <url>', 'Custom Soroban RPC URL')
  .action(async (options) => {
    await runServe(options);
  });

program
  .command('inspect <address>')
  .description('Inspect a Stellar classic account or Soroban contract address')
  .option('-n, --network <network>', 'Stellar network: testnet or pubnet', 'testnet')
  .option('--horizon-url <url>', 'Custom Horizon URL')
  .option('--rpc-url <url>', 'Custom Soroban RPC URL')
  .action(async (address, options) => {
    await runInspect(address, options);
  });

const walletCommand = program.command('wallet').description('Wallet management and testnet funding');

walletCommand
  .command('generate')
  .description('Generate a fresh Ed25519 Stellar keypair')
  .action(async () => {
    await generateWallet();
  });

walletCommand
  .command('fund <address>')
  .description('Fund a Stellar testnet address using Friendbot')
  .action(async (address) => {
    await fundWallet(address);
  });

program
  .command('simulate')
  .description('Simulate an x402 payment challenge, authorization, and settlement flow')
  .option('--tool <name>', 'Name of the tool to simulate', 'soroban_execute_settlement')
  .option('--price <price>', 'Price in token units', '0.05')
  .option('--asset <asset>', 'Asset identifier (e.g. USDC or XLM)', 'USDC')
  .action(async (options) => {
    await runSimulate(options);
  });

program
  .command('benchmark')
  .description('Display gas and fee benchmarks for Stellar payment modalities')
  .action(async () => {
    await runBenchmark();
  });

program.parse(process.argv);
