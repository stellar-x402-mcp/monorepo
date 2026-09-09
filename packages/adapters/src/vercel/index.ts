import { z } from 'zod';
import type { X402AgentMcpClient } from '@stellar-mcp/agent-client';
import { jsonSchemaToZod } from '../common/converter.js';
import { executeAdaptedTool } from '../common/executor.js';
import type { ToolMetadata, AdapterExecutionResult } from '../types.js';

export interface VercelAIToolOptions<TParams = any, TResult = any> {
  name?: string;
  description: string;
  parameters: z.ZodType<TParams>;
  execute: (args: TParams, options?: { toolCallId?: string; messages?: any[] }) => Promise<TResult>;
}

export interface VercelAIToolConfig<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown> | undefined;
  parameters?: z.ZodType<TInput> | undefined;
  execute: (args: TInput) => Promise<TOutput>;
  client?: X402AgentMcpClient | undefined;
}

/**
 * Creates a Vercel AI SDK compatible tool object with auto-paying Stellar x402 settlement.
 * Compatible with generateText({ tools }) and streamText({ tools }) from the 'ai' package.
 */
export function createVercelAITool<TInput = Record<string, unknown>, TOutput = unknown>(
  config: VercelAIToolConfig<TInput, TOutput>
): VercelAIToolOptions<TInput, AdapterExecutionResult<TOutput>> {
  const parameters = config.parameters || (jsonSchemaToZod(config.inputSchema) as unknown as z.ZodType<TInput>);

  return {
    name: config.name,
    description: config.description,
    parameters,
    execute: async (args: TInput) => {
      return executeAdaptedTool<TInput, TOutput>({
        name: config.name,
        input: args,
        toolFn: config.execute,
        client: config.client,
      });
    },
  };
}

/**
 * Converts a collection of MCP tools into a dictionary of Vercel AI SDK tools.
 */
export function createVercelAITools(
  tools: Array<{
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    execute: (args: any) => Promise<any>;
  }>,
  client?: X402AgentMcpClient | undefined
): Record<string, VercelAIToolOptions<any, any>> {
  const result: Record<string, VercelAIToolOptions<any, any>> = {};

  for (const tool of tools) {
    result[tool.name] = createVercelAITool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: tool.execute,
      client,
    });
  }

  return result;
}
