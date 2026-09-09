import { describe, it, expect, vi } from 'vitest';
import { StellarMCPLangChainTool, createLangChainTools } from '../src/langchain/index.js';

describe('LangChain StructuredTool Adapter', () => {
  it('instantiates StellarMCPLangChainTool and invokes with serialization', async () => {
    const mockFn = vi.fn().mockResolvedValue({ txHash: '11223344' });

    const tool = new StellarMCPLangChainTool({
      name: 'submit_stellar_tx',
      description: 'Submit an XDR transaction envelope to Stellar network',
      inputSchema: {
        type: 'object',
        properties: {
          xdr: { type: 'string', description: 'Base64 encoded transaction XDR' },
        },
        required: ['xdr'],
      },
      execute: mockFn,
    });

    expect(tool.name).toBe('submit_stellar_tx');
    expect(tool.description).toContain('Submit an XDR');
    expect(tool.returnDirect).toBe(false);

    const serializedResult = await tool.invoke({ xdr: 'AAAA...==' });
    const parsed = JSON.parse(serializedResult);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ txHash: '11223344' });
    expect(mockFn).toHaveBeenCalledWith({ xdr: 'AAAA...==' });
  });

  it('rejects invalid inputs against Zod schema', async () => {
    const tool = new StellarMCPLangChainTool({
      name: 'require_amount',
      description: 'Requires amount field',
      inputSchema: {
        type: 'object',
        properties: { amount: { type: 'number' } },
        required: ['amount'],
      },
      execute: async () => ({ status: 'ok' }),
    });

    await expect(tool.invoke({ amount: 'invalid-string' } as any)).rejects.toThrow();
  });

  it('batch converts tools to LangChain structured tools', () => {
    const rawTools = [
      {
        name: 'tool_one',
        description: 'First tool',
        execute: async () => 1,
      },
      {
        name: 'tool_two',
        description: 'Second tool',
        execute: async () => 2,
      },
    ];

    const langChainTools = createLangChainTools(rawTools);
    expect(langChainTools.length).toBe(2);
    expect(langChainTools[0]!.name).toBe('tool_one');
    expect(langChainTools[1]!.name).toBe('tool_two');
  });
});
