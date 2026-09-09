import { describe, it, expect, vi } from 'vitest';
import { createVercelAITool, createVercelAITools } from '../src/vercel/index.js';

describe('Vercel AI SDK Adapter', () => {
  it('creates a single Vercel AI SDK tool with schema and execution wrapper', async () => {
    const mockFn = vi.fn().mockResolvedValue({ ledger: 52140 });

    const tool = createVercelAITool({
      name: 'get_latest_ledger',
      description: 'Fetches current ledger sequence on Stellar Testnet',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: mockFn,
    });

    expect(tool.name).toBe('get_latest_ledger');
    expect(tool.description).toBe('Fetches current ledger sequence on Stellar Testnet');
    expect(tool.parameters).toBeDefined();

    const output = await tool.execute({});
    expect(output.success).toBe(true);
    expect(output.data).toEqual({ ledger: 52140 });
    expect(mockFn).toHaveBeenCalledWith({});
  });

  it('converts an array of tools to a Vercel AI tool map', async () => {
    const tools = [
      {
        name: 'stellar_balance',
        description: 'Check account balance',
        inputSchema: {
          type: 'object',
          properties: { account: { type: 'string' } },
          required: ['account'],
        },
        execute: async (args: any) => ({ account: args.account, xlm: '100' }),
      },
      {
        name: 'stellar_fee_stats',
        description: 'Get network fee stats',
        execute: async () => ({ minFee: '100', modeFee: '100' }),
      },
    ];

    const toolMap = createVercelAITools(tools);
    expect(Object.keys(toolMap)).toEqual(['stellar_balance', 'stellar_fee_stats']);

    const balanceRes = await toolMap['stellar_balance']!.execute({ account: 'GABCD' });
    expect(balanceRes.success).toBe(true);
    expect(balanceRes.data).toEqual({ account: 'GABCD', xlm: '100' });
  });
});
