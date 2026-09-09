import { describe, expect, it } from 'vitest';
import {
  ErrorCodeRegistry,
  STANDARD_ERROR_CODES,
  classifyError,
  formatErrorPayload,
  getErrorCode,
  listErrorCodes,
  requireErrorCode,
} from '../src/errors/index.js';

describe('Universal 250 Error Codes Registry', () => {
  it('contains exactly 250 standardized error codes', () => {
    expect(STANDARD_ERROR_CODES.length).toBe(250);
  });

  it('has unique and sequential error codes from 1000 to 1249', () => {
    const codes = STANDARD_ERROR_CODES.map((e) => e.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(250);

    for (let i = 0; i < 250; i++) {
      expect(STANDARD_ERROR_CODES[i]!.code).toBe(1000 + i);
    }
  });

  it('has unique slugs for every error code', () => {
    const slugs = STANDARD_ERROR_CODES.map((e) => e.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(250);
  });

  it('validates exact category partition counts', () => {
    const categories = {
      PROTOCOL: 0,
      HORIZON: 0,
      SOROBAN: 0,
      PAYWALL: 0,
      REPLAY: 0,
      CLIENT: 0,
      DEX: 0,
    };

    for (const err of STANDARD_ERROR_CODES) {
      categories[err.category]++;
      expect(err.message.length).toBeGreaterThan(0);
      expect(err.remedy.length).toBeGreaterThan(0);
      expect(err.httpStatus).toBeGreaterThanOrEqual(200);
      expect(err.httpStatus).toBeLessThan(600);
    }

    expect(categories.PROTOCOL).toBe(40);
    expect(categories.HORIZON).toBe(40);
    expect(categories.SOROBAN).toBe(40);
    expect(categories.PAYWALL).toBe(40);
    expect(categories.REPLAY).toBe(30);
    expect(categories.CLIENT).toBe(30);
    expect(categories.DEX).toBe(30);
  });

  it('retrieves error codes by numeric ID and string slug', () => {
    const byId = getErrorCode(1120);
    expect(byId).toBeDefined();
    expect(byId?.slug).toBe('ERR_PAYWALL_PAYMENT_REQUIRED');
    expect(byId?.httpStatus).toBe(402);

    const bySlug = getErrorCode('ERR_PAYWALL_PAYMENT_REQUIRED');
    expect(bySlug).toBeDefined();
    expect(bySlug?.code).toBe(1120);

    const byCaseInsensitiveSlug = getErrorCode('err_paywall_payment_required');
    expect(byCaseInsensitiveSlug).toBeDefined();
    expect(byCaseInsensitiveSlug?.code).toBe(1120);

    const byNumericString = getErrorCode('1120');
    expect(byNumericString).toBeDefined();
    expect(byNumericString?.code).toBe(1120);

    expect(getErrorCode(9999)).toBeUndefined();
    expect(getErrorCode('NON_EXISTENT')).toBeUndefined();
  });

  it('throws error when requiring a missing code', () => {
    expect(() => requireErrorCode(9999)).toThrow('Standard error code not found: 9999');
    expect(requireErrorCode(1000).slug).toBe('ERR_PROTOCOL_INVALID_JSONRPC');
  });

  it('filters error codes by category, retryable flag, httpStatus, and search query', () => {
    const protocolErrors = listErrorCodes({ category: 'PROTOCOL' });
    expect(protocolErrors.length).toBe(40);

    const retryableErrors = listErrorCodes({ retryable: true });
    expect(retryableErrors.length).toBeGreaterThan(0);

    const status402Errors = listErrorCodes({ httpStatus: 402 });
    expect(status402Errors.length).toBeGreaterThan(0);
    expect(status402Errors.every((e) => e.httpStatus === 402)).toBe(true);

    const searchResults = listErrorCodes({ search: 'circuit breaker' });
    expect(searchResults.length).toBeGreaterThan(0);
    expect(searchResults[0]?.slug).toBe('ERR_CLIENT_CIRCUIT_OPEN');
  });

  it('classifies unknown errors into standard error codes', () => {
    expect(classifyError(new Error('op_underfunded on account')).code).toBe(1049);
    expect(classifyError(new Error('Sequence mismatch detected tx_bad_seq')).code).toBe(1043);
    expect(classifyError(new Error('Soroban host function trapped with panic')).code).toBe(1081);
    expect(classifyError(new Error('Simulation budget CPU instruction limit exceeded')).code).toBe(1082);
    expect(classifyError(new Error('Payment required: 402')).code).toBe(1120);
    expect(classifyError(new Error('Transaction hash already claimed in replay store')).code).toBe(1160);
    expect(classifyError(new Error('maxSpendPerCall exceeded')).code).toBe(1190);
    expect(classifyError(new Error('Circuit breaker is OPEN')).code).toBe(1198);
    expect(classifyError({ status: 429 }).code).toBe(1009);
    expect(classifyError(null).code).toBe(1003);
  });

  it('formats standard error payloads with metadata and details', () => {
    const payload = formatErrorPayload(1120, {
      challenge: 'abc123hash',
      requiredAmount: '1.0000000',
    });

    expect(payload.code).toBe(1120);
    expect(payload.slug).toBe('ERR_PAYWALL_PAYMENT_REQUIRED');
    expect(payload.category).toBe('PAYWALL');
    expect(payload.httpStatus).toBe(402);
    expect(payload.retryable).toBe(false);
    expect(payload.details).toEqual({
      challenge: 'abc123hash',
      requiredAmount: '1.0000000',
    });
    expect(payload.timestamp).toBeDefined();
  });

  it('provides identical functionality via ErrorCodeRegistry static class', () => {
    expect(ErrorCodeRegistry.getAll().length).toBe(250);
    expect(ErrorCodeRegistry.get(1000)?.slug).toBe('ERR_PROTOCOL_INVALID_JSONRPC');
    expect(ErrorCodeRegistry.require(1000).code).toBe(1000);
    expect(ErrorCodeRegistry.query({ category: 'DEX' }).length).toBe(30);
    expect(ErrorCodeRegistry.classify('circuit breaker is open').code).toBe(1198);
    expect(ErrorCodeRegistry.format(1000).code).toBe(1000);
  });
});
