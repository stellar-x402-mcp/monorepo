import { describe, it, expect } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import {
  PaymentChallengeGenerator,
  PaymentChallengeSchema,
} from '../src/challenge.js';

describe('PaymentChallengeGenerator', () => {
  const merchantAddress = Keypair.random().publicKey();
  const generator = new PaymentChallengeGenerator({
    network: 'stellar:testnet',
    defaultRecipient: merchantAddress,
    defaultAsset: 'native',
    defaultValidForSeconds: 300,
  });

  it('should generate a valid payment challenge satisfying the Zod schema', () => {
    const challenge = generator.createChallenge({
      price: '0.05',
    });

    expect(challenge.version).toBe('x402-v1');
    expect(challenge.network).toBe('stellar:testnet');
    expect(challenge.asset).toBe('native');
    expect(challenge.price).toBe('0.05');
    expect(challenge.recipient).toBe(merchantAddress);
    expect(challenge.nonce).toBeDefined();
    expect(challenge.nonce.length).toBe(32);
    expect(challenge.memo).toBeDefined();
    expect(challenge.memo?.startsWith('x402:')).toBe(true);
    expect(challenge.memo?.length).toBeLessThanOrEqual(28); // Stellar text memo limit
    expect(challenge.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000));

    // Validates against schema without throwing
    expect(() => PaymentChallengeSchema.parse(challenge)).not.toThrow();
  });

  it('should include optional resource and description details', () => {
    const challenge = generator.createChallenge({
      price: '0.10',
      resource: '/api/v1/soroban/oracle',
      description: 'Real-time price feed query',
      validForSeconds: 600,
    });

    expect(challenge.details?.resource).toBe('/api/v1/soroban/oracle');
    expect(challenge.details?.description).toBe('Real-time price feed query');
    expect(challenge.validUntil).toBeGreaterThan(Math.floor(Date.now() / 1000) + 500);
  });

  it('should serialize challenge into standard HTTP headers', () => {
    const challenge = generator.createChallenge({
      price: '0.02',
    });

    const headers = generator.toHttpHeaders(challenge);
    expect(headers['WWW-Authenticate']).toContain('X402');
    expect(headers['WWW-Authenticate']).toContain('realm="Stellar MCP Paywall"');
    expect(headers['WWW-Authenticate']).toContain(`recipient="${merchantAddress}"`);
    expect(headers['X-Payment-Challenge']).toBeDefined();
    expect(headers['X-Payment-Nonce']).toBe(challenge.nonce);
    expect(headers['X-Payment-Valid-Until']).toBe(challenge.validUntil.toString());

    // Roundtrip test via fromBase64
    const decoded = PaymentChallengeGenerator.fromBase64(headers['X-Payment-Challenge']);
    expect(decoded.nonce).toBe(challenge.nonce);
    expect(decoded.price).toBe('0.02');
    expect(decoded.recipient).toBe(merchantAddress);
  });

  it('should correctly detect expired and unexpired challenges', () => {
    const validChallenge = generator.createChallenge({
      price: '0.01',
      validForSeconds: 60,
    });
    expect(PaymentChallengeGenerator.isExpired(validChallenge)).toBe(false);

    const expiredChallenge = {
      ...validChallenge,
      validUntil: Math.floor(Date.now() / 1000) - 10,
    };
    expect(PaymentChallengeGenerator.isExpired(expiredChallenge)).toBe(true);
  });
});
