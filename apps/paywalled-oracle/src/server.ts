import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PaymentRequiredError } from '@stellar-mcp/paywall';
import { defaultConfig, OracleConfig } from './config.js';
import {
  createPaywalledPriceTool,
  OraclePriceInputSchema,
} from './tools/price.js';
import {
  createPaywalledTvlTool,
  OracleTvlInputSchema,
} from './tools/tvl.js';
import {
  createPaywalledRouteTool,
  OracleRouteInputSchema,
} from './tools/route.js';

export function createOracleServer(userConfig: Partial<OracleConfig> = {}) {
  const config: OracleConfig = {
    ...defaultConfig,
    ...userConfig,
    prices: {
      ...defaultConfig.prices,
      ...(userConfig.prices || {}),
    },
  };

  const server = new Server(
    {
      name: 'stellar-paywalled-oracle',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const priceTool = createPaywalledPriceTool(config);
  const tvlTool = createPaywalledTvlTool(config);
  const routeTool = createPaywalledRouteTool(config);

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'oracle_get_dex_price',
          description: `[x402 Paywalled: ${config.prices.dexPrice} USDC] Real-time orderbook bids, asks, spread, and VWAP for any Stellar asset pair`,
          inputSchema: {
            type: 'object',
            properties: {
              baseAsset: {
                type: 'string',
                description: 'Base asset: "native" (XLM) or "CODE:ISSUER"',
                default: 'native',
              },
              quoteAsset: {
                type: 'string',
                description: 'Quote asset: "native" or "CODE:ISSUER"',
                default: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
              },
              depth: {
                type: 'number',
                description: 'Orderbook depth levels to evaluate (1-50)',
                default: 10,
              },
            },
          },
        },
        {
          name: 'oracle_get_soroban_tvl',
          description: `[x402 Paywalled: ${config.prices.sorobanTvl} USDC] Soroban contract storage analytics, pool reserves, and total value locked`,
          inputSchema: {
            type: 'object',
            properties: {
              targetAddress: {
                type: 'string',
                description: 'Soroban contract ID or liquidity pool ID to inspect',
              },
              targetType: {
                type: 'string',
                enum: ['contract', 'liquidity_pool'],
                default: 'contract',
                description: 'Target asset structure type',
              },
            },
            required: ['targetAddress'],
          },
        },
        {
          name: 'oracle_get_swap_route',
          description: `[x402 Paywalled: ${config.prices.swapRoute} USDC] Optimal path payment routing with slippage, price impact, and fee estimation`,
          inputSchema: {
            type: 'object',
            properties: {
              sourceAsset: {
                type: 'string',
                description: 'Source asset to spend: "native" or "CODE:ISSUER"',
                default: 'native',
              },
              destinationAsset: {
                type: 'string',
                description: 'Destination asset to receive: "native" or "CODE:ISSUER"',
                default: 'USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
              },
              destinationAmount: {
                type: 'string',
                description: 'Desired destination amount to receive',
                default: '10.0',
              },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: rawArgs = {} } = request.params;
    const paymentSignature =
      (rawArgs as any).paymentSignature || (rawArgs as any)._paymentSignature;

    // Clean payment metadata from tool arguments
    const toolArgs = { ...rawArgs };
    delete (toolArgs as any).paymentSignature;
    delete (toolArgs as any)._paymentSignature;

    const callContext = paymentSignature ? { paymentSignature } : undefined;

    try {
      let result: any;

      switch (name) {
        case 'oracle_get_dex_price': {
          result = await priceTool(toolArgs as any, callContext);
          break;
        }
        case 'oracle_get_soroban_tvl': {
          result = await tvlTool(toolArgs as any, callContext);
          break;
        }
        case 'oracle_get_swap_route': {
          result = await routeTool(toolArgs as any, callContext);
          break;
        }
        default:
          throw new Error(`Tool not found: ${name}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      if (error instanceof PaymentRequiredError || error.name === 'PaymentRequiredError') {
        const errorPayload = {
          error: 'PAYMENT_REQUIRED',
          challenge: error.challenge,
          code: 1120,
          category: 'PAYWALL',
          message: error.message,
          retryable: true,
          remedy:
            'Submit a valid on-chain payment or state channel voucher to satisfy the x402 challenge',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(errorPayload),
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'TOOL_EXECUTION_FAILED',
              message: error.message || 'Unknown error occurred during tool execution',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return { server, config, priceTool, tvlTool, routeTool };
}
