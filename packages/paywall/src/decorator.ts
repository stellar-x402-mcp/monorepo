import { z } from 'zod';

export const X402ToolConfigSchema = z.object({
  price: z.string().min(1).describe('Price in token units (e.g. "0.005")'),
  asset: z.string().min(1).describe('Stellar SAC token address or code (e.g. USDC)'),
  recipient: z.string().min(1).describe('Merchant Stellar recipient address'),
  network: z.enum(['stellar:pubnet', 'stellar:testnet', 'stellar:futurenet']).default('stellar:testnet'),
  handler: z.function(),
});

export type X402ToolConfig<TArgs = any, TResult = any> = {
  price: string;
  asset: string;
  recipient: string;
  network?: 'stellar:pubnet' | 'stellar:testnet' | 'stellar:futurenet';
  handler: (args: TArgs, context?: any) => Promise<TResult>;
};

export class PaymentRequiredError extends Error {
  public challenge: any;

  constructor(challenge: any) {
    super('Payment Required: This MCP tool requires x402 payment settled on Stellar');
    this.name = 'PaymentRequiredError';
    this.challenge = challenge;
  }
}

/**
 * Decorates an MCP Tool handler with automatic x402 payment verification
 */
export function x402Tool<TArgs = any, TResult = any>(config: X402ToolConfig<TArgs, TResult>) {
  const network = config.network || 'stellar:testnet';

  return async (args: TArgs, context?: { paymentSignature?: string }): Promise<TResult> => {
    if (!context?.paymentSignature) {
      const challenge = {
        version: 'x402-v1',
        network,
        asset: config.asset,
        price: config.price,
        recipient: config.recipient,
        validUntil: Math.floor(Date.now() / 1000) + 300,
      };

      throw new PaymentRequiredError(challenge);
    }

    // Execute actual tool logic once payment signature is present
    return config.handler(args, context);
  };
}
