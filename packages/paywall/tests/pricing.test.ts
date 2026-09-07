import { describe, it, expect } from 'vitest';
import { DynamicPricingEngine } from '../src/pricing.js';

describe('DynamicPricingEngine', () => {
  it('should calculate fixed price correctly', async () => {
    const engine = new DynamicPricingEngine({
      model: 'fixed',
      basePrice: '0.005',
    });

    const price = await engine.calculatePrice();
    expect(price).toBe('0.0050000');
  });

  it('should calculate per-token pricing based on token count', async () => {
    const engine = new DynamicPricingEngine({
      model: 'per_token',
      basePrice: '0.001',
      pricePerToken: '0.00001',
    });

    const price = await engine.calculatePrice({ tokens: 500 });
    // 0.001 + (500 * 0.00001) = 0.001 + 0.005 = 0.006
    expect(price).toBe('0.0060000');
  });

  it('should calculate tiered usage pricing', async () => {
    const engine = new DynamicPricingEngine({
      model: 'tiered',
      basePrice: '0',
      tiers: [
        { upToUnit: 10, unitPrice: '0.01' },
        { upToUnit: 50, unitPrice: '0.008' },
        { upToUnit: 100, unitPrice: '0.005' },
      ],
    });

    // 5 units falls in tier 1 (0.01 * 5 = 0.05)
    const tier1Price = await engine.calculatePrice({ units: 5 });
    expect(tier1Price).toBe('0.0500000');

    // 25 units falls in tier 2 (0.008 * 25 = 0.2)
    const tier2Price = await engine.calculatePrice({ units: 25 });
    expect(tier2Price).toBe('0.2000000');

    // 150 units exceeds top tier, gets top tier unitPrice (0.005 * 150 = 0.75)
    const topTierPrice = await engine.calculatePrice({ units: 150 });
    expect(topTierPrice).toBe('0.7500000');
  });

  it('should support dynamic compute price functions', async () => {
    const engine = new DynamicPricingEngine({
      model: 'compute',
      basePrice: '0.01',
      computePriceFn: async (ctx) => {
        const queryLength = ctx.metadata?.query?.length || 0;
        return (0.01 + queryLength * 0.001).toString();
      },
    });

    const price = await engine.calculatePrice({
      metadata: { query: 'SELECT * FROM stellar_transactions' }, // 34 chars -> 0.01 + 0.034 = 0.044
    });

    expect(price).toBe('0.0440000');
  });

  it('should enforce min and max price guardrails', async () => {
    const engine = new DynamicPricingEngine({
      model: 'per_token',
      basePrice: '0.001',
      pricePerToken: '0.001',
      minPrice: '0.005',
      maxPrice: '0.050',
    });

    // Low tokens: 0.001 + 1 * 0.001 = 0.002, clamped to minPrice 0.005
    const clampedMin = await engine.calculatePrice({ tokens: 1 });
    expect(clampedMin).toBe('0.0050000');

    // High tokens: 0.001 + 200 * 0.001 = 0.201, clamped to maxPrice 0.050
    const clampedMax = await engine.calculatePrice({ tokens: 200 });
    expect(clampedMax).toBe('0.0500000');
  });
});
