import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  GetBalanceSchema,
  handleGetBalance,
  GetAccountDetailsSchema,
  handleGetAccountDetails,
} from './tools/account.js';
import {
  SimulateContractSchema,
  handleSimulateContract,
  GetLedgerEntriesSchema,
  handleGetLedgerEntries,
  GetTransactionSchema,
  handleGetTransaction,
  AssembleTransactionSchema,
  handleAssembleTransaction,
  ReadStorageSchema,
  handleReadStorage,
} from './tools/contract.js';
import {
  FindPaymentPathsSchema,
  handleFindPaymentPaths,
  SubmitTransactionSchema,
  handleSubmitTransaction,
  SwapTokensSchema,
  handleSwapTokens,
} from './tools/payment.js';
import { QueryEventsSchema, handleQueryEvents } from './tools/events.js';
import {
  GetLatestLedgerSchema,
  handleGetLatestLedger,
  GetNetworkSchema,
  handleGetNetwork,
} from './tools/network.js';
import {
  GetOrderbookSchema,
  handleGetOrderbook,
  GetLiquidityPoolsSchema,
  handleGetLiquidityPools,
} from './tools/dex.js';
import {
  GetClaimableBalancesSchema,
  handleGetClaimableBalances,
} from './tools/claimable.js';

export interface ServerConfig {
  horizonUrl?: string;
  sorobanRpcUrl?: string;
}

export function createStellarMcpServer(config?: ServerConfig) {
  const horizonUrl = config?.horizonUrl || 'https://horizon-testnet.stellar.org';
  const sorobanRpcUrl = config?.sorobanRpcUrl || 'https://soroban-testnet.stellar.org';

  const server = new Server(
    {
      name: 'stellar-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'stellar_get_balance',
          description: 'Fetch native XLM and SAC token balances for a Stellar account',
          inputSchema: {
            type: 'object',
            properties: {
              accountAddress: { type: 'string', description: 'Stellar G... public key' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['accountAddress'],
          },
        },
        {
          name: 'stellar_get_account_details',
          description: 'Inspect detailed Stellar account state including sequence number, thresholds, signer weights, flags, and balances',
          inputSchema: {
            type: 'object',
            properties: {
              accountAddress: { type: 'string', description: 'Stellar G... public key' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['accountAddress'],
          },
        },
        {
          name: 'soroban_simulate_contract',
          description: 'Simulate a Soroban smart contract invocation to inspect state, CPU/memory resource footprint, and return values without submitting',
          inputSchema: {
            type: 'object',
            properties: {
              contractId: { type: 'string', description: 'Soroban C... contract ID' },
              method: { type: 'string', description: 'Method name' },
              args: { type: 'array', description: 'Method arguments', default: [] },
              transactionXdr: { type: 'string', description: 'Base64-encoded TransactionEnvelope XDR to simulate' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'soroban_simulate_invocation',
          description: 'Simulate Soroban transaction envelope or invocation to inspect CPU instructions, memory footprint, and auth entries',
          inputSchema: {
            type: 'object',
            properties: {
              transactionXdr: { type: 'string', description: 'Base64-encoded TransactionEnvelope XDR to simulate' },
              contractId: { type: 'string', description: 'Soroban C... contract ID' },
              method: { type: 'string', description: 'Method name' },
              args: { type: 'array', description: 'Method arguments', default: [] },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'stellar_find_payment_paths',
          description: 'Find strict-receive DEX payment paths and source token amounts',
          inputSchema: {
            type: 'object',
            properties: {
              sourceAccount: { type: 'string', description: 'Sender Stellar G... public key' },
              destinationAccount: { type: 'string', description: 'Recipient Stellar G... public key' },
              destinationAsset: { type: 'string', description: '"native" or "CODE:ISSUER"' },
              destinationAmount: { type: 'string', description: 'Amount recipient receives' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['sourceAccount', 'destinationAccount', 'destinationAsset', 'destinationAmount'],
          },
        },
        {
          name: 'stellar_submit_transaction',
          description: 'Submit a signed transaction envelope XDR to the Stellar network',
          inputSchema: {
            type: 'object',
            properties: {
              signedEnvelopeXdr: { type: 'string', description: 'Base64 signed envelope XDR' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['signedEnvelopeXdr'],
          },
        },
        {
          name: 'soroban_query_events',
          description: 'Query Soroban contract event logs by contract ID, topic, and ledger range',
          inputSchema: {
            type: 'object',
            properties: {
              startLedger: { type: 'integer', description: 'Start ledger sequence number' },
              contractIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Soroban Contract IDs (C...)',
              },
              topics: {
                type: 'array',
                items: { type: 'string' },
                description: 'Event topic filters',
              },
              cursor: { type: 'string', description: 'Pagination cursor' },
              limit: { type: 'integer', description: 'Maximum number of events (up to 1000)' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'stellar_swap_tokens',
          description: 'Build optimal DEX path payment swap transaction or execute signed swap envelope',
          inputSchema: {
            type: 'object',
            properties: {
              sourceAccount: { type: 'string', description: 'Sender Stellar G... public key' },
              destinationAccount: { type: 'string', description: 'Optional recipient Stellar G... public key' },
              sendAsset: { type: 'string', description: '"native" or "CODE:ISSUER"' },
              sendMax: { type: 'string', description: 'Maximum amount of source token willing to spend' },
              destAsset: { type: 'string', description: '"native" or "CODE:ISSUER"' },
              destAmount: { type: 'string', description: 'Exact amount of destination token to receive' },
              path: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional explicit intermediate asset path',
              },
              signedEnvelopeXdr: { type: 'string', description: 'Optional signed envelope XDR for execution' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['sourceAccount', 'sendAsset', 'sendMax', 'destAsset', 'destAmount'],
          },
        },
        {
          name: 'soroban_get_ledger_entries',
          description: 'Read contract data and instance storage keys directly from Soroban RPC ledger state',
          inputSchema: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of base64-encoded LedgerKey XDR strings',
              },
              contractId: { type: 'string', description: 'Soroban Contract ID (C...) to inspect' },
              keySymbol: { type: 'string', description: 'Storage key symbol name or instance if omitted' },
              durability: {
                type: 'string',
                enum: ['persistent', 'temporary'],
                default: 'persistent',
                description: 'Storage durability type',
              },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'soroban_get_transaction',
          description: 'Poll and inspect Soroban transaction status, execution results, and metadata XDR',
          inputSchema: {
            type: 'object',
            properties: {
              hash: { type: 'string', description: 'Hex-encoded transaction hash (64 characters)' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['hash'],
          },
        },
        {
          name: 'soroban_get_latest_ledger',
          description: 'Get the latest ledger sequence, hash, and protocol version from Soroban RPC',
          inputSchema: {
            type: 'object',
            properties: {
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'soroban_get_network',
          description: 'Get Soroban network passphrase, protocol version, and friendbot URL',
          inputSchema: {
            type: 'object',
            properties: {
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'soroban_assemble_transaction',
          description: 'Assemble an unsigned Soroban invocation transaction envelope with simulated footprint, resource fee, and authorization',
          inputSchema: {
            type: 'object',
            properties: {
              transactionXdr: { type: 'string', description: 'Base64-encoded un-assembled Soroban TransactionEnvelope XDR' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['transactionXdr'],
          },
        },
        {
          name: 'soroban_read_storage',
          description: 'High-level deserializer for Soroban contract storage (SAC token balances, admin keys, user maps) directly into native JSON',
          inputSchema: {
            type: 'object',
            properties: {
              contractId: { type: 'string', description: 'Soroban C... contract ID' },
              key: { type: 'string', description: 'Storage key name, user address, or ScVal XDR' },
              keyType: {
                type: 'string',
                enum: ['symbol', 'address', 'sac_balance', 'instance', 'raw_scval_xdr'],
                default: 'symbol',
                description: 'Storage key type',
              },
              userAddress: { type: 'string', description: 'User address (G...) for SAC token balance lookups' },
              durability: { type: 'string', enum: ['persistent', 'temporary'], default: 'persistent' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['contractId'],
          },
        },
        {
          name: 'stellar_get_orderbook',
          description: 'Get real-time Stellar DEX orderbook bids, asks, and price spread analysis for any asset pair',
          inputSchema: {
            type: 'object',
            properties: {
              sellingAsset: { type: 'string', description: 'Asset being sold: "native" or "CODE:ISSUER"' },
              buyingAsset: { type: 'string', description: 'Asset being bought: "native" or "CODE:ISSUER"' },
              limit: { type: 'integer', minimum: 1, maximum: 200, default: 20, description: 'Depth of orders to fetch' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['sellingAsset', 'buyingAsset'],
          },
        },
        {
          name: 'stellar_get_liquidity_pools',
          description: 'Query Stellar AMM liquidity pools, reserve balances, fee tiers, and total shares',
          inputSchema: {
            type: 'object',
            properties: {
              poolId: { type: 'string', description: 'Specific 64-character hex liquidity pool ID' },
              reserves: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter pools by reserve assets ("native" or "CODE:ISSUER")',
              },
              account: { type: 'string', description: 'Filter pools where account holds shares (G...)' },
              cursor: { type: 'string', description: 'Pagination cursor' },
              limit: { type: 'integer', minimum: 1, maximum: 200, default: 20, description: 'Number of pools to return' },
              order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
        {
          name: 'stellar_get_claimable_balances',
          description: 'Query and inspect Stellar claimable balances, claimants, predicates, and optionally build unsigned claim transaction envelopes',
          inputSchema: {
            type: 'object',
            properties: {
              claimant: { type: 'string', description: 'Filter by claimant Stellar account address (G...)' },
              sponsor: { type: 'string', description: 'Filter by sponsor Stellar account address (G...)' },
              asset: { type: 'string', description: 'Filter by asset format "native" or "CODE:ISSUER"' },
              balanceId: { type: 'string', description: 'Specific claimable balance ID to query' },
              buildClaimEnvelope: { type: 'boolean', default: false, description: 'If true and claimant provided, build unsigned claim transaction envelope' },
              cursor: { type: 'string', description: 'Pagination cursor' },
              limit: { type: 'integer', minimum: 1, maximum: 200, default: 20, description: 'Number of records to return' },
              order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'stellar_get_balance') {
      const parsed = GetBalanceSchema.parse(args);
      const result = await handleGetBalance(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_get_account_details') {
      const parsed = GetAccountDetailsSchema.parse(args);
      const result = await handleGetAccountDetails(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_simulate_contract' || name === 'soroban_simulate_invocation') {
      const parsed = SimulateContractSchema.parse(args);
      const result = await handleSimulateContract(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_find_payment_paths') {
      const parsed = FindPaymentPathsSchema.parse(args);
      const result = await handleFindPaymentPaths(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_submit_transaction') {
      const parsed = SubmitTransactionSchema.parse(args);
      const result = await handleSubmitTransaction(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_query_events') {
      const parsed = QueryEventsSchema.parse(args || {});
      const result = await handleQueryEvents(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_swap_tokens') {
      const parsed = SwapTokensSchema.parse(args);
      const result = await handleSwapTokens(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_get_ledger_entries') {
      const parsed = GetLedgerEntriesSchema.parse(args || {});
      const result = await handleGetLedgerEntries(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_get_transaction') {
      const parsed = GetTransactionSchema.parse(args);
      const result = await handleGetTransaction(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_get_latest_ledger') {
      const parsed = GetLatestLedgerSchema.parse(args || {});
      const result = await handleGetLatestLedger(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_get_network') {
      const parsed = GetNetworkSchema.parse(args || {});
      const result = await handleGetNetwork(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_assemble_transaction') {
      const parsed = AssembleTransactionSchema.parse(args);
      const result = await handleAssembleTransaction(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'soroban_read_storage') {
      const parsed = ReadStorageSchema.parse(args);
      const result = await handleReadStorage(parsed, sorobanRpcUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_get_orderbook') {
      const parsed = GetOrderbookSchema.parse(args);
      const result = await handleGetOrderbook(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_get_liquidity_pools') {
      const parsed = GetLiquidityPoolsSchema.parse(args || {});
      const result = await handleGetLiquidityPools(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    if (name === 'stellar_get_claimable_balances') {
      const parsed = GetClaimableBalancesSchema.parse(args || {});
      const result = await handleGetClaimableBalances(parsed, horizonUrl);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}

export async function runStdioServer() {
  const server = createStellarMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
