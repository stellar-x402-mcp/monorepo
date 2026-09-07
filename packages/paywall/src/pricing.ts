export type PricingModel = 'fixed' | 'tiered' | 'per_token' | 'compute';

export interface TierConfig {
  upToUnit: number;
  unitPrice: string;
}

export interface PricingRule {
  model: PricingModel;
  basePrice: string;
  minPrice?: string;
  maxPrice?: string;
  pricePerToken?: string;
  tiers?: TierConfig[];
  computePriceFn?: (context: PricingContext) => Promise<string> | string;
}

export interface PricingContext {
  tokens?: number;
  units?: number;
  complexityScore?: number;
  metadata?: Record<string, any>;
}

export class DynamicPricingEngine {
  private rule: PricingRule;

  constructor(rule: PricingRule) {
    this.rule = rule;
  }

  /**
   * Calculates the required micro-payment price based on model and invocation context
   */
  async calculatePrice(context?: PricingContext): Promise<string> {
    let calculated = parseFloat(this.rule.basePrice);

    if (this.rule.model === 'per_token') {
      const tokens = context?.tokens || 0;
      const rate = parseFloat(this.rule.pricePerToken || '0');
      calculated = calculated + tokens * rate;
    } else if (this.rule.model === 'tiered') {
      const units = context?.units || 1;
      if (this.rule.tiers && this.rule.tiers.length > 0) {
        // Find matching tier
        const matchedTier = this.rule.tiers.find((t) => units <= t.upToUnit);
        if (matchedTier) {
          calculated = parseFloat(matchedTier.unitPrice) * units;
        } else {
          const highestTier = this.rule.tiers[this.rule.tiers.length - 1];
          if (highestTier) {
            calculated = parseFloat(highestTier.unitPrice) * units;
          }
        }
      }
    } else if (this.rule.model === 'compute') {
      if (this.rule.computePriceFn) {
        const dynamicResult = await this.rule.computePriceFn(context || {});
        calculated = parseFloat(dynamicResult);
      } else if (context?.complexityScore) {
        calculated = calculated * context.complexityScore;
      }
    }

    // Apply minimum bound if configured
    if (this.rule.minPrice !== undefined) {
      const min = parseFloat(this.rule.minPrice);
      if (calculated < min) {
        calculated = min;
      }
    }

    // Apply maximum bound if configured
    if (this.rule.maxPrice !== undefined) {
      const max = parseFloat(this.rule.maxPrice);
      if (calculated > max) {
        calculated = max;
      }
    }

    // Round to 7 decimal places (standard Stellar stroop precision)
    return calculated.toFixed(7);
  }

  getRule(): PricingRule {
    return { ...this.rule };
  }
}
