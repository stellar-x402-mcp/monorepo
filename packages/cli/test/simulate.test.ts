import { describe, it, expect, vi } from 'vitest';
import { runSimulate } from '../src/commands/simulate.js';

describe('CLI Simulate Command', () => {
  it('executes simulation flow without throwing', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(
      runSimulate({
        tool: 'custom_test_tool',
        price: '0.10',
        asset: 'XLM',
      })
    ).resolves.not.toThrow();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
