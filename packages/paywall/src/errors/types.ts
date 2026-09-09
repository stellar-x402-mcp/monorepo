export type ErrorCategory =
  | 'PROTOCOL'
  | 'HORIZON'
  | 'SOROBAN'
  | 'PAYWALL'
  | 'REPLAY'
  | 'CLIENT'
  | 'DEX';

export interface StandardErrorCode {
  code: number;
  slug: string;
  category: ErrorCategory;
  httpStatus: number;
  retryable: boolean;
  message: string;
  remedy: string;
}

export interface ErrorCodeQueryFilter {
  category?: ErrorCategory | undefined;
  retryable?: boolean | undefined;
  httpStatus?: number | undefined;
  search?: string | undefined;
}

export interface StandardErrorPayload {
  code: number;
  slug: string;
  category: ErrorCategory;
  message: string;
  remedy: string;
  retryable: boolean;
  httpStatus: number;
  details?: Record<string, unknown> | string | undefined;
  timestamp: string;
}
