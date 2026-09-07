import { z } from 'zod';
import crypto from 'node:crypto';

export const PaymentChallengeSchema = z.object({
  version: z.literal('x402-v1').default('x402-v1'),
  network: z.enum(['stellar:pubnet', 'stellar:testnet', 'stellar:futurenet']).default('stellar:testnet'),
  asset: z.string().min(1).describe('Asset code:issuer, "native", or SAC contract address'),
  price: z.string().min(1).describe('Payment price in token units'),
  recipient: z.string().min(56).max(56).describe('Recipient Stellar account public key (G...)'),
  nonce: z.string().min(16).describe('Cryptographically random challenge nonce'),
  validUntil: z.number().int().positive().describe('Unix timestamp in seconds when challenge expires'),
  memo: z.string().optional().describe('Expected transaction memo string'),
  details: z
    .object({
      resource: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

export type PaymentChallenge = z.infer<typeof PaymentChallengeSchema>;

export interface ChallengeGeneratorConfig {
  network?: 'stellar:pubnet' | 'stellar:testnet' | 'stellar:futurenet';
  defaultRecipient: string;
  defaultAsset?: string;
  defaultValidForSeconds?: number;
}

export interface CreateChallengeOptions {
  price: string;
  recipient?: string;
  asset?: string;
  network?: 'stellar:pubnet' | 'stellar:testnet' | 'stellar:futurenet';
  validForSeconds?: number;
  resource?: string;
  description?: string;
}

export class PaymentChallengeGenerator {
  private network: 'stellar:pubnet' | 'stellar:testnet' | 'stellar:futurenet';
  private defaultRecipient: string;
  private defaultAsset: string;
  private defaultValidForSeconds: number;

  constructor(config: ChallengeGeneratorConfig) {
    this.network = config.network || 'stellar:testnet';
    this.defaultRecipient = config.defaultRecipient;
    this.defaultAsset = config.defaultAsset || 'native';
    this.defaultValidForSeconds = config.defaultValidForSeconds || 300; // 5 minutes default
  }

  /**
   * Generates a new cryptographically unique x402 payment challenge
   */
  createChallenge(options: CreateChallengeOptions): PaymentChallenge {
    const nonce = crypto.randomBytes(16).toString('hex');
    const validFor = options.validForSeconds || this.defaultValidForSeconds;
    const validUntil = Math.floor(Date.now() / 1000) + validFor;
    const recipient = options.recipient || this.defaultRecipient;
    const asset = options.asset || this.defaultAsset;
    const network = options.network || this.network;

    // Memo is truncated to max 28 characters for Stellar standard text memo compatibility
    const memo = `x402:${nonce.slice(0, 23)}`;

    const challenge: PaymentChallenge = {
      version: 'x402-v1',
      network,
      asset,
      price: options.price,
      recipient,
      nonce,
      validUntil,
      memo,
    };

    if (options.resource || options.description) {
      challenge.details = {
        resource: options.resource,
        description: options.description,
      };
    }

    return PaymentChallengeSchema.parse(challenge);
  }

  /**
   * Serializes a payment challenge into an HTTP response headers map
   */
  toHttpHeaders(challenge: PaymentChallenge): Record<string, string> {
    const challengeJson = JSON.stringify(challenge);
    const base64Challenge = Buffer.from(challengeJson).toString('base64');

    return {
      'WWW-Authenticate': `X402 realm="Stellar MCP Paywall", network="${challenge.network}", asset="${challenge.asset}", price="${challenge.price}", recipient="${challenge.recipient}"`,
      'X-Payment-Challenge': base64Challenge,
      'X-Payment-Nonce': challenge.nonce,
      'X-Payment-Valid-Until': challenge.validUntil.toString(),
    };
  }

  /**
   * Decodes and validates challenge headers or base64 token from client request
   */
  static fromBase64(base64Payload: string): PaymentChallenge {
    const raw = Buffer.from(base64Payload, 'base64').toString('utf-8');
    const parsed = JSON.parse(raw);
    return PaymentChallengeSchema.parse(parsed);
  }

  /**
   * Checks if a challenge has expired based on current epoch time
   */
  static isExpired(challenge: PaymentChallenge): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now > challenge.validUntil;
  }
}
