import type { z } from 'zod';
import type { PaymentChallenge } from '@stellar-mcp/paywall';
import type { SettlementResult } from '@stellar-mcp/agent-client';

/**
 * Common metadata representation for any tool exposed across agent frameworks.
 */
export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown> | undefined;
}

/**
 * Generic execution context passed to adapter tool invocations.
 */
export interface AdapterExecutionContext {
  agentId?: string | undefined;
  conversationId?: string | undefined;
  maxPaymentStroops?: string | undefined;
  whitelistedMerchants?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Result returned by an adapted tool execution, including optional on-chain payment receipt.
 */
export interface AdapterExecutionResult<T = unknown> {
  success: boolean;
  data?: T | undefined;
  settlement?: SettlementResult | undefined;
  error?: {
    code: number;
    message: string;
    category?: string | undefined;
    retryable?: boolean | undefined;
    remediation?: string | undefined;
  } | undefined;
  durationMs: number;
}

/**
 * Handler interface for settling paywall challenges during agent tool execution.
 */
export interface PaymentExecutionHandler {
  settleChallenge(challenge: PaymentChallenge, context?: AdapterExecutionContext): Promise<SettlementResult>;
}

/**
 * Standard tool representation convertible across Vercel AI SDK, LangChain, and LlamaIndex.
 */
export interface UnifiedAgentTool<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  parameters: z.ZodType<TInput>;
  execute: (input: TInput, context?: AdapterExecutionContext) => Promise<TOutput>;
}
