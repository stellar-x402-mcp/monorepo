import type { X402AgentMcpClient } from '@stellar-mcp/agent-client';
import { executeAdaptedTool } from '../common/executor.js';
import type { ToolMetadata, AdapterExecutionResult } from '../types.js';

export interface LlamaToolMetadata {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LlamaToolConfig<TInput = Record<string, unknown>, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown> | undefined;
  execute: (args: TInput) => Promise<TOutput>;
  client?: X402AgentMcpClient | undefined;
}

/**
 * Standard LlamaIndex BaseTool compatible class for Stellar MCP tools.
 */
export class StellarMCPLlamaTool<TInput = Record<string, unknown>, TOutput = unknown> {
  public metadata: LlamaToolMetadata;
  private executeFn: (args: TInput) => Promise<TOutput>;
  private client?: X402AgentMcpClient | undefined;

  constructor(config: LlamaToolConfig<TInput, TOutput>) {
    this.metadata = {
      name: config.name,
      description: config.description,
      parameters: config.inputSchema || { type: 'object', properties: {} },
    };
    this.executeFn = config.execute;
    this.client = config.client;
  }

  /**
   * Main call entrypoint required by LlamaIndex agent loops (ReActAgent, OpenAIAgent).
   */
  async call(input: TInput): Promise<AdapterExecutionResult<TOutput>> {
    return executeAdaptedTool<TInput, TOutput>({
      name: this.metadata.name,
      input,
      toolFn: this.executeFn,
      client: this.client,
    });
  }
}

/**
 * Converts a collection of MCP tools into an array of LlamaIndex BaseTool instances.
 */
export function createLlamaIndexTools(
  tools: Array<{
    name: string;
    description: string;
    inputSchema?: Record<string, unknown>;
    execute: (args: any) => Promise<any>;
  }>,
  client?: X402AgentMcpClient | undefined
): StellarMCPLlamaTool<any, any>[] {
  return tools.map(
    (tool) =>
      new StellarMCPLlamaTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        execute: tool.execute,
        client,
      })
  );
}
