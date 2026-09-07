import { describe, it, expect, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { x402Tool, PaymentRequiredError } from '@stellar-mcp/paywall';
import { X402AgentMcpClient } from '../src/client.js';

describe('End-to-End MCP Client to Paywalled Server Integration', () => {
  it('should complete automated 402 challenge resolution over MCP transport', async () => {
    // 1. Define paywalled tool logic using @stellar-mcp/paywall
    const merchantRecipient = 'GD5DJNZ2Z5V5P3R2XZ2Q77E5W273FTHYAY2I3G2Z2BVR7XFF5S5KXZ3S';
    const sacAsset = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

    const premiumAnalysisHandler = x402Tool({
      price: '0.01', // 0.01 USDC
      asset: sacAsset,
      recipient: merchantRecipient,
      network: 'stellar:testnet',
      handler: async (args: { pair: string }, context?: { paymentSignature?: string }) => {
        return {
          pair: args.pair,
          signal: 'STRONG_BUY',
          confidence: 0.94,
          source: 'soroban_dex_oracle',
          verifiedSigner: context?.paymentSignature,
        };
      },
    });

    // 2. Initialize MCP Server and wire paywalled tool
    const server = new Server(
      { name: 'mock-paywalled-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_market_signal',
          description: 'Premium Soroban market signal oracle (paywalled at 0.01 USDC)',
          inputSchema: {
            type: 'object',
            properties: {
              pair: { type: 'string' },
              paymentSignature: { type: 'string' },
            },
            required: ['pair'],
          },
        },
      ],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (name === 'get_market_signal') {
        try {
          const result = await premiumAnalysisHandler(
            { pair: (args as any)?.pair || 'XLM/USDC' },
            { paymentSignature: (args as any)?.paymentSignature }
          );
          return {
            content: [{ type: 'text', text: JSON.stringify(result) }],
          };
        } catch (err: any) {
          if (err instanceof PaymentRequiredError || err.name === 'PaymentRequiredError') {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: 'PAYMENT_REQUIRED',
                    challenge: err.challenge,
                  }),
                },
              ],
              isError: true,
            };
          }
          throw err;
        }
      }
      throw new Error(`Unknown tool: ${name}`);
    });

    // 3. Connect Client and Server using InMemoryTransport pair
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const mcpClient = new Client(
      { name: 'test-agent', version: '1.0.0' },
      { capabilities: {} }
    );
    await mcpClient.connect(clientTransport);

    // 4. Configure X402AgentMcpClient with signing spy and budget policy
    const signSpy = vi.fn().mockImplementation(async (challenge: any) => {
      return `SIG_ED25519_AUTH_${challenge.asset}_${challenge.price}`;
    });

    const agentClient = new X402AgentMcpClient({
      payerAddress: 'GB_AGENT_TEST_PAYER',
      budgetPolicy: {
        maxSpendPerCall: 0.05,
        maxDailySpend: 0.20,
      },
      signAuthorization: signSpy,
    });

    // 5. Invoke paywalled tool through agent client
    const response = await agentClient.callTool(mcpClient, 'get_market_signal', {
      pair: 'XLM/USDC',
    });

    // 6. Assertions on response and protocol lifecycle
    expect(response.isError).toBeFalsy();
    const payload = JSON.parse(response.content[0].text);
    expect(payload.pair).toBe('XLM/USDC');
    expect(payload.signal).toBe('STRONG_BUY');
    expect(payload.confidence).toBe(0.94);
    expect(payload.verifiedSigner).toBe(`SIG_ED25519_AUTH_${sacAsset}_0.01`);

    // Verify signing callback was invoked exactly once with structured challenge
    expect(signSpy).toHaveBeenCalledTimes(1);
    expect(signSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 'x402-v1',
        network: 'stellar:testnet',
        asset: sacAsset,
        price: '0.01',
        recipient: merchantRecipient,
      })
    );
  });

  it('should enforce fail-closed policy when tool price exceeds maxSpendPerCall', async () => {
    const server = new Server(
      { name: 'mock-expensive-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{ name: 'expensive_tool', inputSchema: { type: 'object' } }],
    }));

    server.setRequestHandler(CallToolRequestSchema, async () => {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'PAYMENT_REQUIRED',
              challenge: {
                price: '0.50', // Exceeds 0.05 limit
                asset: 'USDC',
                network: 'stellar:testnet',
              },
            }),
          },
        ],
        isError: true,
      };
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const mcpClient = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await mcpClient.connect(clientTransport);

    const signSpy = vi.fn();
    const agentClient = new X402AgentMcpClient({
      payerAddress: 'GB_AGENT_TEST_PAYER',
      budgetPolicy: {
        maxSpendPerCall: 0.05,
        maxDailySpend: 1.00,
      },
      signAuthorization: signSpy,
    });

    await expect(agentClient.callTool(mcpClient, 'expensive_tool')).rejects.toThrow(
      /Budget exceeded: Cannot spend 0.5 tokens/
    );

    expect(signSpy).not.toHaveBeenCalled();
  });

  it('should track cumulative daily spending across sequential paywalled invocations', async () => {
    const server = new Server(
      { name: 'mock-sequential-server', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [{ name: 'micro_tool', inputSchema: { type: 'object' } }],
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments as any;
      if (!args?.paymentSignature) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'PAYMENT_REQUIRED',
                challenge: {
                  price: '0.04',
                  asset: 'USDC',
                  network: 'stellar:testnet',
                },
              }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true }) }],
      };
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);

    const mcpClient = new Client({ name: 'test-agent', version: '1.0.0' }, { capabilities: {} });
    await mcpClient.connect(clientTransport);

    const signSpy = vi.fn().mockResolvedValue('MOCK_SIG');
    const agentClient = new X402AgentMcpClient({
      payerAddress: 'GB_AGENT_TEST_PAYER',
      budgetPolicy: {
        maxSpendPerCall: 0.05,
        maxDailySpend: 0.09, // Can afford two 0.04 calls (0.08 total), but not a third
      },
      signAuthorization: signSpy,
    });

    // Call 1 (spends 0.04, remaining: 0.05)
    const res1 = await agentClient.callTool(mcpClient, 'micro_tool');
    expect(JSON.parse(res1.content[0].text).ok).toBe(true);

    // Call 2 (spends 0.04, remaining: 0.01)
    const res2 = await agentClient.callTool(mcpClient, 'micro_tool');
    expect(JSON.parse(res2.content[0].text).ok).toBe(true);

    // Call 3 (needs 0.04, but only 0.01 remaining -> must throw)
    await expect(agentClient.callTool(mcpClient, 'micro_tool')).rejects.toThrow(
      /Budget exceeded: Cannot spend 0.04 tokens/
    );

    expect(signSpy).toHaveBeenCalledTimes(2);
  });
});
