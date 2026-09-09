import { describe, it, expect, vi } from 'vitest';
import { executeAdaptedTool } from '../src/common/executor.js';

describe('Tool Executor with Resilience and Registry', () => {
  it('executes tool function and returns duration and success', async () => {
    const mockTool = vi.fn().mockResolvedValue({ status: 'ok', balance: '100.5 XLM' });

    const result = await executeAdaptedTool({
      name: 'get_balance',
      input: { address: 'GABC' },
      toolFn: mockTool,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ status: 'ok', balance: '100.5 XLM' });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('maps budget exceeded error to 250 error code 1192', async () => {
    const mockTool = vi.fn().mockRejectedValue(new Error('Budget exceeded: daily limit reached'));

    const result = await executeAdaptedTool({
      name: 'premium_oracle',
      input: { pair: 'XLM/USD' },
      toolFn: mockTool,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(1192);
    expect(result.error?.category).toBe('CLIENT');
    expect(result.error?.remediation).toBeDefined();
  });

  it('maps upstream timeout error to 250 error code 1008', async () => {
    const mockTool = vi.fn().mockRejectedValue(new Error('Upstream RPC request timed out after 5000ms'));

    const result = await executeAdaptedTool({
      name: 'simulate_contract',
      input: { contractId: 'C123' },
      toolFn: mockTool,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe(1008);
    expect(result.error?.category).toBe('PROTOCOL');
    expect(result.error?.retryable).toBe(true);
  });

  it('delegates to X402AgentMcpClient invokeTool when client is provided', async () => {
    const mockClient = {
      invokeTool: vi.fn().mockImplementation(async (fn: any, args: any) => {
        return fn(args);
      }),
    };

    const mockTool = vi.fn().mockResolvedValue({ txHash: 'abc12345' });

    const result = await executeAdaptedTool({
      name: 'transfer_sac',
      input: { amount: '10' },
      toolFn: mockTool,
      client: mockClient as any,
    });

    expect(mockClient.invokeTool).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ txHash: 'abc12345' });
  });
});
