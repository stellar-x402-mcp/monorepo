import { getErrorCode, requireErrorCode } from '@stellar-mcp/paywall';
import { X402AgentMcpClient } from '@stellar-mcp/agent-client';
import type { AdapterExecutionContext, AdapterExecutionResult } from '../types.js';

export interface ExecuteAdaptedToolOptions<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  input: TInput;
  toolFn: (args: TInput, context?: AdapterExecutionContext) => Promise<TOutput>;
  client?: X402AgentMcpClient | undefined;
  context?: AdapterExecutionContext | undefined;
}

/**
 * Executes a tool with automatic x402 challenge settlement, metrics tracking,
 * and mapping to the Universal 250 Error Codes Registry.
 */
export async function executeAdaptedTool<TInput = Record<string, unknown>, TOutput = unknown>(
  options: ExecuteAdaptedToolOptions<TInput, TOutput>
): Promise<AdapterExecutionResult<TOutput>> {
  const startTime = Date.now();

  try {
    let result: TOutput;
    if (options.client) {
      result = await options.client.invokeTool(
        (args: any) =>
          options.context !== undefined
            ? options.toolFn(args, options.context)
            : options.toolFn(args),
        options.input
      );
    } else {
      result =
        options.context !== undefined
          ? await options.toolFn(options.input, options.context)
          : await options.toolFn(options.input);
    }

    const durationMs = Date.now() - startTime;
    return {
      success: true,
      data: result,
      durationMs,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    const message = error?.message || 'Tool execution encountered an unknown error';

    if (error?.code && typeof error.code === 'number') {
      const entry = getErrorCode(error.code);
      if (entry) {
        return {
          success: false,
          error: {
            code: entry.code,
            message: message || entry.message,
            category: entry.category,
            retryable: entry.retryable,
            remediation: entry.remedy,
          },
          durationMs,
        };
      }
    }

    let slug = 'ERR_PROTOCOL_INTERNAL_ERROR';
    if (error?.name === 'PaymentRequiredError' || message.includes('Payment Required')) {
      slug = 'ERR_PAYWALL_PAYMENT_REQUIRED';
    } else if (message.includes('Budget exceeded') || message.includes('daily limit')) {
      slug = 'ERR_CLIENT_BUDGET_DAILY_EXCEEDED';
    } else if (message.includes('Circuit breaker is open') || message.includes('CIRCUIT_OPEN')) {
      slug = 'ERR_CLIENT_CIRCUIT_OPEN';
    } else if (message.includes('timeout') || message.includes('timed out')) {
      slug = 'ERR_PROTOCOL_REQUEST_TIMEOUT';
    } else if (message.includes('Validation') || message.includes('invalid')) {
      slug = 'ERR_PROTOCOL_INVALID_PARAMS';
    }

    const entry = getErrorCode(slug) || requireErrorCode('ERR_PROTOCOL_INTERNAL_ERROR');

    return {
      success: false,
      error: {
        code: entry.code,
        message,
        category: entry.category,
        retryable: entry.retryable,
        remediation: entry.remedy,
      },
      durationMs,
    };
  }
}
