import { describe, it, expect, vi } from 'vitest';
import { StellarMCPLlamaTool, createLlamaIndexTools } from '../src/llamaindex/index.js';

describe('LlamaIndex BaseTool Adapter', () => {
  it('implements LlamaIndex BaseTool metadata and call interface', async () => {
    const mockFn = vi.fn().mockResolvedValue({ status: 'funded', amount: '10000' });

    const tool = new StellarMCPLlamaTool({
      name: 'friendbot_fund',
      description: 'Fund testnet account with friendbot',
      inputSchema: {
        type: 'object',
        properties: {
          publicKey: { type: 'string' },
        },
        required: ['publicKey'],
      },
      execute: mockFn,
    });

    expect(tool.metadata.name).toBe('friendbot_fund');
    expect(tool.metadata.description).toBe('Fund testnet account with friendbot');
    expect(tool.metadata.parameters).toBeDefined();

    const result = await tool.call({ publicKey: 'GCXYZ' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'funded', amount: '10000' });
    expect(mockFn).toHaveBeenCalledWith({ publicKey: 'GCXYZ' });
  });

  it('batch converts tools to LlamaIndex tools', () => {
    const rawTools = [
      {
        name: 'llama_tool_a',
        description: 'Tool A',
        execute: async () => 'A',
      },
      {
        name: 'llama_tool_b',
        description: 'Tool B',
        execute: async () => 'B',
      },
    ];

    const llamaTools = createLlamaIndexTools(rawTools);
    expect(llamaTools.length).toBe(2);
    expect(llamaTools[0]!.metadata.name).toBe('llama_tool_a');
    expect(llamaTools[1]!.metadata.name).toBe('llama_tool_b');
  });
});
