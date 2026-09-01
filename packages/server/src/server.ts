import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { GetBalanceSchema, handleGetBalance } from './tools/account.js';
import { SimulateContractSchema, handleSimulateContract } from './tools/contract.js';

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
          name: 'soroban_simulate_contract',
          description: 'Simulate a Soroban smart contract invocation to inspect state and returns without submitting',
          inputSchema: {
            type: 'object',
            properties: {
              contractId: { type: 'string', description: 'Soroban C... contract ID' },
              method: { type: 'string', description: 'Method name' },
              args: { type: 'array', description: 'Method arguments', default: [] },
              network: { type: 'string', enum: ['testnet', 'pubnet'], default: 'testnet' },
            },
            required: ['contractId', 'method'],
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

    if (name === 'soroban_simulate_contract') {
      const parsed = SimulateContractSchema.parse(args);
      const result = await handleSimulateContract(parsed, sorobanRpcUrl);
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
