import { OnChainTransactionVerifier, VerificationResult } from './verifier.js';
import { ReplayProtector } from './replay.js';
import { PaymentChallengeGenerator, PaymentChallenge } from './challenge.js';
import { DynamicPricingEngine, PricingContext } from './pricing.js';

export interface X402MiddlewareOptions {
  recipient: string;
  price: string;
  asset?: string;
  network?: 'stellar:pubnet' | 'stellar:testnet' | 'stellar:futurenet';
  validForSeconds?: number;
  resource?: string;
  description?: string;
  verifier?: OnChainTransactionVerifier;
  replayProtector?: ReplayProtector;
  pricingEngine?: DynamicPricingEngine;
}

export interface AuthenticatedPaymentContext extends VerificationResult {
  challenge?: PaymentChallenge;
}

function extractPaymentProof(headers: Record<string, any>): { txHash?: string; envelopeXdr?: string } | null {
  const authHeader = headers['authorization'] || headers['x-payment-signature'] || headers['x-payment-tx'];
  if (!authHeader) return null;

  const headerStr = typeof authHeader === 'string' ? authHeader : authHeader[0] || '';
  if (!headerStr) return null;

  if (headerStr.startsWith('X402 ') || headerStr.startsWith('Bearer ')) {
    const token = headerStr.split(' ')[1]?.trim();
    if (token) {
      if (token.length === 64 && /^[0-9a-fA-F]+$/.test(token)) {
        return { txHash: token };
      }
      return { envelopeXdr: token };
    }
  }

  if (headerStr.length === 64 && /^[0-9a-fA-F]+$/.test(headerStr)) {
    return { txHash: headerStr };
  }

  return { envelopeXdr: headerStr };
}

/**
 * Express middleware for protecting HTTP routes with x402 micro-payments on Stellar
 */
export function x402Express(options: X402MiddlewareOptions) {
  const generator = new PaymentChallengeGenerator({
    network: options.network || 'stellar:testnet',
    defaultRecipient: options.recipient,
    defaultAsset: options.asset || 'native',
    defaultValidForSeconds: options.validForSeconds || 300,
  });

  const verifier =
    options.verifier ||
    new OnChainTransactionVerifier({
      network: options.network === 'stellar:pubnet' ? 'stellar:pubnet' : 'stellar:testnet',
    });

  const replay = options.replayProtector || new ReplayProtector();

  return async (req: any, res: any, next: any) => {
    let requiredPrice = options.price;
    if (options.pricingEngine) {
      const pricingCtx: PricingContext = {
        tokens: req.body?.tokens || req.query?.tokens,
        units: req.body?.units || req.query?.units,
        complexityScore: req.body?.complexityScore,
        metadata: { path: req.path, method: req.method },
      };
      requiredPrice = await options.pricingEngine.calculatePrice(pricingCtx);
    }

    const proof = extractPaymentProof(req.headers || {});
    if (!proof) {
      const challenge = generator.createChallenge({
        price: requiredPrice,
        resource: options.resource || req.originalUrl || req.url,
        description: options.description,
      });
      const headers = generator.toHttpHeaders(challenge);
      for (const [key, val] of Object.entries(headers)) {
        res.setHeader(key, val);
      }
      return res.status(402).json({
        error: 'Payment Required',
        message: 'This endpoint requires an HTTP 402 micro-payment settled on Stellar',
        challenge,
      });
    }

    const txKey = proof.txHash || proof.envelopeXdr || '';
    const claimRes = await replay.claim(txKey);
    if (!claimRes.success) {
      return res.status(402).json({
        error: 'Payment Replay Detected',
        message: claimRes.error,
      });
    }

    let verifyResult: VerificationResult;
    if (proof.txHash) {
      verifyResult = await verifier.verifyTransactionHash(proof.txHash, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    } else {
      verifyResult = await verifier.verifyEnvelopeXdr(proof.envelopeXdr!, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    }

    if (!verifyResult.verified) {
      return res.status(402).json({
        error: 'Invalid Payment',
        message: verifyResult.error,
      });
    }

    req.x402 = verifyResult;
    next();
  };
}

/**
 * Fastify preHandler hook for protecting routes with x402 micro-payments on Stellar
 */
export function x402Fastify(options: X402MiddlewareOptions) {
  const generator = new PaymentChallengeGenerator({
    network: options.network || 'stellar:testnet',
    defaultRecipient: options.recipient,
    defaultAsset: options.asset || 'native',
    defaultValidForSeconds: options.validForSeconds || 300,
  });

  const verifier =
    options.verifier ||
    new OnChainTransactionVerifier({
      network: options.network === 'stellar:pubnet' ? 'stellar:pubnet' : 'stellar:testnet',
    });

  const replay = options.replayProtector || new ReplayProtector();

  return async (request: any, reply: any) => {
    let requiredPrice = options.price;
    if (options.pricingEngine) {
      const pricingCtx: PricingContext = {
        tokens: request.body?.tokens || request.query?.tokens,
        units: request.body?.units || request.query?.units,
        complexityScore: request.body?.complexityScore,
        metadata: { url: request.url, method: request.method },
      };
      requiredPrice = await options.pricingEngine.calculatePrice(pricingCtx);
    }

    const proof = extractPaymentProof(request.headers || {});
    if (!proof) {
      const challenge = generator.createChallenge({
        price: requiredPrice,
        resource: options.resource || request.url,
        description: options.description,
      });
      const headers = generator.toHttpHeaders(challenge);
      for (const [key, val] of Object.entries(headers)) {
        reply.header(key, val);
      }
      return reply.code(402).send({
        error: 'Payment Required',
        message: 'This endpoint requires an HTTP 402 micro-payment settled on Stellar',
        challenge,
      });
    }

    const txKey = proof.txHash || proof.envelopeXdr || '';
    const claimRes = await replay.claim(txKey);
    if (!claimRes.success) {
      return reply.code(402).send({
        error: 'Payment Replay Detected',
        message: claimRes.error,
      });
    }

    let verifyResult: VerificationResult;
    if (proof.txHash) {
      verifyResult = await verifier.verifyTransactionHash(proof.txHash, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    } else {
      verifyResult = await verifier.verifyEnvelopeXdr(proof.envelopeXdr!, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    }

    if (!verifyResult.verified) {
      return reply.code(402).send({
        error: 'Invalid Payment',
        message: verifyResult.error,
      });
    }

    request.x402 = verifyResult;
  };
}

/**
 * Hono and Web Standards fetch middleware for protecting routes with x402 micro-payments
 */
export function x402Hono(options: X402MiddlewareOptions) {
  const generator = new PaymentChallengeGenerator({
    network: options.network || 'stellar:testnet',
    defaultRecipient: options.recipient,
    defaultAsset: options.asset || 'native',
    defaultValidForSeconds: options.validForSeconds || 300,
  });

  const verifier =
    options.verifier ||
    new OnChainTransactionVerifier({
      network: options.network === 'stellar:pubnet' ? 'stellar:pubnet' : 'stellar:testnet',
    });

  const replay = options.replayProtector || new ReplayProtector();

  return async (c: any, next: any) => {
    let requiredPrice = options.price;
    if (options.pricingEngine) {
      const pricingCtx: PricingContext = {
        metadata: { url: c.req.url, method: c.req.method },
      };
      requiredPrice = await options.pricingEngine.calculatePrice(pricingCtx);
    }

    const headers: Record<string, string> = {};
    if (c.req.raw?.headers) {
      c.req.raw.headers.forEach((val: string, key: string) => {
        headers[key.toLowerCase()] = val;
      });
    } else if (c.req.header) {
      const auth = c.req.header('authorization');
      const sig = c.req.header('x-payment-signature');
      const tx = c.req.header('x-payment-tx');
      if (auth) headers['authorization'] = auth;
      if (sig) headers['x-payment-signature'] = sig;
      if (tx) headers['x-payment-tx'] = tx;
    }

    const proof = extractPaymentProof(headers);
    if (!proof) {
      const challenge = generator.createChallenge({
        price: requiredPrice,
        resource: options.resource || c.req.url,
        description: options.description,
      });
      const challengeHeaders = generator.toHttpHeaders(challenge);
      for (const [key, val] of Object.entries(challengeHeaders)) {
        c.header(key, val);
      }
      return c.json(
        {
          error: 'Payment Required',
          message: 'This endpoint requires an HTTP 402 micro-payment settled on Stellar',
          challenge,
        },
        402
      );
    }

    const txKey = proof.txHash || proof.envelopeXdr || '';
    const claimRes = await replay.claim(txKey);
    if (!claimRes.success) {
      return c.json(
        {
          error: 'Payment Replay Detected',
          message: claimRes.error,
        },
        402
      );
    }

    let verifyResult: VerificationResult;
    if (proof.txHash) {
      verifyResult = await verifier.verifyTransactionHash(proof.txHash, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    } else {
      verifyResult = await verifier.verifyEnvelopeXdr(proof.envelopeXdr!, {
        expectedRecipient: options.recipient,
        expectedPrice: requiredPrice,
        expectedAsset: options.asset,
      });
    }

    if (!verifyResult.verified) {
      return c.json(
        {
          error: 'Invalid Payment',
          message: verifyResult.error,
        },
        402
      );
    }

    c.set('x402', verifyResult);
    await next();
  };
}
