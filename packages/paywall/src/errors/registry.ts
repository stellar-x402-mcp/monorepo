import { STANDARD_ERROR_CODES } from './codes.js';
import type {
  ErrorCodeQueryFilter,
  StandardErrorCode,
  StandardErrorPayload,
} from './types.js';

const codeMap = new Map<number, StandardErrorCode>();
const slugMap = new Map<string, StandardErrorCode>();

for (const err of STANDARD_ERROR_CODES) {
  codeMap.set(err.code, err);
  slugMap.set(err.slug.toUpperCase(), err);
}

/**
 * Retrieve a standard error code by numeric ID or string slug.
 */
export function getErrorCode(
  codeOrSlug: number | string
): StandardErrorCode | undefined {
  if (typeof codeOrSlug === 'number') {
    return codeMap.get(codeOrSlug);
  }
  const numeric = Number(codeOrSlug);
  if (!Number.isNaN(numeric) && codeMap.has(numeric)) {
    return codeMap.get(numeric);
  }
  return slugMap.get(codeOrSlug.trim().toUpperCase());
}

/**
 * Retrieve a standard error code or throw an error if not found.
 */
export function requireErrorCode(codeOrSlug: number | string): StandardErrorCode {
  const found = getErrorCode(codeOrSlug);
  if (!found) {
    throw new Error(`Standard error code not found: ${String(codeOrSlug)}`);
  }
  return found;
}

/**
 * Query and filter standard error codes.
 */
export function listErrorCodes(
  filter?: ErrorCodeQueryFilter | undefined
): StandardErrorCode[] {
  let results = Array.from(STANDARD_ERROR_CODES);

  if (!filter) {
    return results;
  }

  if (filter.category) {
    results = results.filter((err) => err.category === filter.category);
  }

  if (filter.retryable !== undefined) {
    results = results.filter((err) => err.retryable === filter.retryable);
  }

  if (filter.httpStatus !== undefined) {
    results = results.filter((err) => err.httpStatus === filter.httpStatus);
  }

  if (filter.search) {
    const term = filter.search.toLowerCase();
    results = results.filter(
      (err) =>
        err.slug.toLowerCase().includes(term) ||
        err.message.toLowerCase().includes(term) ||
        err.remedy.toLowerCase().includes(term) ||
        String(err.code).includes(term)
    );
  }

  return results;
}

/**
 * Heuristically classify an unknown error or response into a standard error code.
 */
export function classifyError(error: unknown): StandardErrorCode {
  if (!error) {
    return requireErrorCode(1003); // ERR_PROTOCOL_INTERNAL_ERROR
  }

  // Already a StandardErrorCode
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'number'
  ) {
    const found = getErrorCode((error as Record<string, unknown>).code as number);
    if (found) return found;
  }

  const errObj = error as Record<string, unknown>;
  const msg = (
    typeof error === 'string'
      ? error
      : (errObj.message as string) || (errObj.detail as string) || ''
  ).toLowerCase();

  // Horizon transaction / operation error codes
  if (msg.includes('op_underfunded') || msg.includes('underfunded')) {
    return requireErrorCode(1049); // ERR_HORIZON_UNDERFUNDED
  }
  if (msg.includes('op_no_destination') || msg.includes('account not found')) {
    return requireErrorCode(1040); // ERR_HORIZON_ACCOUNT_NOT_FOUND
  }
  if (msg.includes('tx_bad_seq') || msg.includes('sequence mismatch')) {
    return requireErrorCode(1043); // ERR_HORIZON_SEQUENCE_MISMATCH
  }
  if (msg.includes('op_no_trust') || msg.includes('trustline missing')) {
    return requireErrorCode(1046); // ERR_HORIZON_TRUSTLINE_MISSING
  }
  if (msg.includes('op_line_full') || msg.includes('trustline full')) {
    return requireErrorCode(1047); // ERR_HORIZON_TRUSTLINE_FULL
  }
  if (msg.includes('tx_insufficient_fee') || msg.includes('fee underpriced')) {
    return requireErrorCode(1050); // ERR_HORIZON_FEE_UNDERPRICED
  }
  if (msg.includes('tx_bad_auth') || msg.includes('bad_auth')) {
    return requireErrorCode(1044); // ERR_HORIZON_BAD_AUTH
  }
  if (msg.includes('op_no_issuer') || msg.includes('asset untradable')) {
    return requireErrorCode(1233); // ERR_DEX_ASSET_UNTRADABLE
  }

  // Soroban errors
  if (msg.includes('cpu instruction limit') || msg.includes('budget_cpu')) {
    return requireErrorCode(1082); // ERR_SOROBAN_BUDGET_CPU_EXCEEDED
  }
  if (msg.includes('memory limit exceeded') || msg.includes('budget_memory')) {
    return requireErrorCode(1083); // ERR_SOROBAN_BUDGET_MEMORY_EXCEEDED
  }
  if (msg.includes('host function trapped') || msg.includes('host trap') || msg.includes('panic')) {
    return requireErrorCode(1081); // ERR_SOROBAN_HOST_TRAP
  }
  if (msg.includes('contract not found') || msg.includes('contract_not_found')) {
    return requireErrorCode(1086); // ERR_SOROBAN_CONTRACT_NOT_FOUND
  }
  if (msg.includes('storage expired') || msg.includes('restorefootprint')) {
    return requireErrorCode(1097); // ERR_SOROBAN_STORAGE_EXPIRED
  }

  // Paywall & Replay
  if (msg.includes('payment required') || msg.includes('402')) {
    return requireErrorCode(1120); // ERR_PAYWALL_PAYMENT_REQUIRED
  }
  if (msg.includes('challenge expired')) {
    return requireErrorCode(1122); // ERR_PAYWALL_CHALLENGE_EXPIRED
  }
  if (msg.includes('amount underpaid') || msg.includes('underpaid')) {
    return requireErrorCode(1126); // ERR_PAYWALL_AMOUNT_UNDERPAID
  }
  if (msg.includes('already claimed') || msg.includes('duplicate payment') || msg.includes('replay')) {
    return requireErrorCode(1160); // ERR_REPLAY_TX_HASH_CLAIMED
  }

  // Client budget & resilience
  if (msg.includes('maxspendpercall') || msg.includes('budget exceeded')) {
    return requireErrorCode(1190); // ERR_CLIENT_BUDGET_CALL_EXCEEDED
  }
  if (msg.includes('circuit_open') || msg.includes('circuit breaker is open')) {
    return requireErrorCode(1198); // ERR_CLIENT_CIRCUIT_OPEN
  }

  // HTTP status code mappings
  const status =
    (errObj.status as number) ||
    (errObj.httpStatus as number) ||
    (errObj.statusCode as number);

  if (status === 400) return requireErrorCode(1004);
  if (status === 401) return requireErrorCode(1018);
  if (status === 402) return requireErrorCode(1120);
  if (status === 403) return requireErrorCode(1019);
  if (status === 404) return requireErrorCode(1001);
  if (status === 408) return requireErrorCode(1008);
  if (status === 409) return requireErrorCode(1021);
  if (status === 413) return requireErrorCode(1010);
  if (status === 429) return requireErrorCode(1009);
  if (status === 502) return requireErrorCode(1026);
  if (status === 503) return requireErrorCode(1025);
  if (status === 504) return requireErrorCode(1027);

  return requireErrorCode(1003); // Fallback: ERR_PROTOCOL_INTERNAL_ERROR
}

/**
 * Format a standard error payload suitable for MCP tool responses or HTTP responses.
 */
export function formatErrorPayload(
  codeOrSlug: number | string,
  details?: Record<string, unknown> | string | undefined
): StandardErrorPayload {
  const err = requireErrorCode(codeOrSlug);
  const payload: StandardErrorPayload = {
    code: err.code,
    slug: err.slug,
    category: err.category,
    message: err.message,
    remedy: err.remedy,
    retryable: err.retryable,
    httpStatus: err.httpStatus,
    timestamp: new Date().toISOString(),
  };

  if (details !== undefined) {
    payload.details = details;
  }

  return payload;
}

export class ErrorCodeRegistry {
  public static getAll(): readonly StandardErrorCode[] {
    return STANDARD_ERROR_CODES;
  }

  public static get(codeOrSlug: number | string): StandardErrorCode | undefined {
    return getErrorCode(codeOrSlug);
  }

  public static require(codeOrSlug: number | string): StandardErrorCode {
    return requireErrorCode(codeOrSlug);
  }

  public static query(filter?: ErrorCodeQueryFilter): StandardErrorCode[] {
    return listErrorCodes(filter);
  }

  public static classify(error: unknown): StandardErrorCode {
    return classifyError(error);
  }

  public static format(
    codeOrSlug: number | string,
    details?: Record<string, unknown> | string
  ): StandardErrorPayload {
    return formatErrorPayload(codeOrSlug, details);
  }
}
