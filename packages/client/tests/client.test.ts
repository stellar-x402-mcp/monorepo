import { describe, it, expect, vi } from 'vitest';
import { X402AgentMcpClient } from '../src/client.js';

describe('X402AgentMcpClient', () => {
  it('should auto-retry and resolve 402 paywalled tool invocations', async () => {
    const mockTool = vi
      .fn()
      .mockRejectedValueOnce({
        name: 'PaymentRequiredError',
        challenge: { price: '0.005', asset: 'USDC', network: 'stellar:testnet' },
      })
      .mockResolvedValueOnce({ success: true, result: 'Tool Execution Output' });

    const client = new X402AgentMcpClient({
      payerAddress: 'GB_PAYER',
      budgetPolicy: { maxSpendPerCall: 0.05, maxDailySpend: 1.0 },
      signAuthorization: async (challenge) => `SIGNED_${challenge.price}`,
    });

    const output = await client.invokeTool(mockTool, { param: 'test' });
    expect(output.success).toBe(true);
    expect(output.result).toBe('Tool Execution Output');
    expect(mockTool).toHaveBeenCalledTimes(2);
  });

  it('should reject tool execution if call price exceeds maxSpendPerCall', async () => {
    const mockTool = vi.fn().mockRejectedValue({
      name: 'PaymentRequiredError',
      challenge: { price: '0.50', asset: 'USDC' }, // Exceeds 0.05 cap
    });

    const client = new X402AgentMcpClient({
      payerAddress: 'GB_PAYER',
      budgetPolicy: { maxSpendPerCall: 0.05, maxDailySpend: 1.0 },
      signAuthorization: async () => 'SIGNED',
    });

    await expect(client.invokeTool(mockTool, {})).rejects.toThrow(/Budget exceeded/);
  });
});
