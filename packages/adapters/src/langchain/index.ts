import { z } from 'zod';
import type { X402AgentMcpClient } from '@stellar-mcp/agent-client';
import { jsonSchemaToZod } from '../common/converter.js';
import { executeAdaptedTool } from '../common/executor.js';
import type { ToolMetadata, AdapterExecutionResult } from '../types.js';

export interface LangChainToolConfig<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown> | undefined;
  schema?: z.ZodObject<Record<string, z.ZodTypeAny>> | undefined;
  execute: (args: TInput) => Promise<TOutput>;
  client?: X402AgentMcpClient | undefined;
  returnDirect?: boolean | undefined;
}

/**
 * Standard LangChain StructuredTool compatible class for Stellar MCP tools.
 */
export class StellarMCPLangChainTool<TInput = Record<string, unknown>, TOutput = unknown> {
  public name: string;
  public description: string;
  public schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  public returnDirect: boolean;

  private executeFn: (args: TInput) => Promise<TOutput>;
  private client?: X402AgentMcpClient | undefined;

  constructor(config: LangChainToolConfig<TInput, TOutput>) {
    this.name = config.name;
    this.description = config.description;
    this.schema = config.schema || jsonSchemaToZod(config.inputSchema);
    this.returnDirect = config.returnDirect ?? false;
    this.executeFn = config.execute;
    this.client = config.client;
  }

  /**
   * Main call method invoked by LangChain agents.
   */
  async _call(input: TInput): Promise<string> {
    const validated = this.schema.parse(input) as TInput;
    const result = await executeAdaptedTool<TInput, TOutput>({
      name: this.name,
      input: validated,
      toolFn: this.executeFn,
      client: this.client,
    });

    return JSON.stringify(result);
  }

  /**
   * Invocation entrypoint matching LangChain Runnable interface.
   */
  async invoke(input: TInput): Promise<string> {
    return this._call(input);
  }

  /**
   * Direct execution returning structured typed result.
   */
  async execute(input: TInput): Promise<AdapterExecutionResult<TOutput>> {
    const validated = this.schema.parse(input) as TInput;
    return executeAdaptedTool<TInput, TOutput>({
      name: this.name,
      input: validated,
      toolFn: this.executeFn,
      client: this.client,
    });
  }
}

/**
 * Converts a collection of MCP tools into an array of LangChain StructuredTool instances.
 */
export function createLangChainTools(
  tools: Array<{
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    execute: (args: any) => Promise<any>;
  }>,
  client?: X402AgentMcpClient | undefined
): StellarMCPLangChainTool<any, any>[] {
  return tools.map(
    (tool) =>
      new StellarMCPLangChainTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
        client,
      })
  );
}
