import { describe, it, expect, vi } from 'vitest';
import { runBenchmark } from '../src/commands/benchmark.js';

describe('CLI Benchmark Command', () => {
  it('prints benchmark metrics without throwing', async () => {
    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(runBenchmark()).resolves.not.toThrow();
    expect(tableSpy).toHaveBeenCalled();

    tableSpy.mockRestore();
    logSpy.mockRestore();
  });
});
