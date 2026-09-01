import { describe, it, expect } from 'vitest';
import { x402Tool, PaymentRequiredError } from '../src/decorator.js';

describe('@stellar-mcp/paywall (@x402Tool)', () => {
  const mockTool = x402Tool({
    price: '0.005',
    asset: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    recipient: 'GCALKSGAZRJLSUEJT3M5W6LN4R7XQOLIRCOS6ZA6EDZVTZDBIIPPFKJ6',
    network: 'stellar:testnet',
    handler: async (args: { query: string }) => {
      return { answer: `Analyzed ${args.query}` };
    },
  });

  it('should throw PaymentRequiredError with challenge when unpaid', async () => {
    try {
      await mockTool({ query: 'crypto market' });
      expect.fail('Should have thrown PaymentRequiredError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(PaymentRequiredError);
      expect(err.challenge.price).toBe('0.005');
      expect(err.challenge.network).toBe('stellar:testnet');
    }
  });

  it('should execute successfully when payment signature context is provided', async () => {
    const result = await mockTool(
      { query: 'crypto market' },
      { paymentSignature: 'VALID_AUTH_SIGNATURE' }
    );

    expect(result.answer).toBe('Analyzed crypto market');
  });
});
