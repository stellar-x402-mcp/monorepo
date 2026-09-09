import { describe, it, expect } from 'vitest';
import { jsonSchemaToZod, jsonSchemaPropertyToZod, mcpToolToZodSchema } from '../src/common/converter.js';

describe('Schema Converter', () => {
  it('converts string and enum properties', () => {
    const stringProp = jsonSchemaPropertyToZod({ type: 'string', description: 'User name' });
    expect(stringProp.safeParse('Alice').success).toBe(true);
    expect(stringProp.safeParse(123).success).toBe(false);

    const enumProp = jsonSchemaPropertyToZod({
      type: 'string',
      enum: ['native', 'sac', 'channel'],
    });
    expect(enumProp.safeParse('sac').success).toBe(true);
    expect(enumProp.safeParse('invalid').success).toBe(false);
  });

  it('converts numeric and boolean properties', () => {
    const numProp = jsonSchemaPropertyToZod({ type: 'number' });
    expect(numProp.safeParse(42.5).success).toBe(true);
    expect(numProp.safeParse('42').success).toBe(false);

    const boolProp = jsonSchemaPropertyToZod({ type: 'boolean' });
    expect(boolProp.safeParse(true).success).toBe(true);
    expect(boolProp.safeParse('true').success).toBe(false);
  });

  it('converts nested object and array properties', () => {
    const arrayProp = jsonSchemaPropertyToZod({
      type: 'array',
      items: { type: 'string' },
    });
    expect(arrayProp.safeParse(['a', 'b', 'c']).success).toBe(true);
    expect(arrayProp.safeParse(['a', 123]).success).toBe(false);

    const objProp = jsonSchemaToZod({
      type: 'object',
      properties: {
        destination: { type: 'string' },
        amount: { type: 'number' },
      },
      required: ['destination'],
    });

    expect(objProp.safeParse({ destination: 'GABC' }).success).toBe(true);
    expect(objProp.safeParse({ destination: 'GABC', amount: 10 }).success).toBe(true);
    expect(objProp.safeParse({ amount: 10 }).success).toBe(false);
  });

  it('converts MCP tool definition inputSchema directly', () => {
    const mcpTool = {
      name: 'send_payment',
      description: 'Send payment on Stellar',
      inputSchema: {
        type: 'object',
        properties: {
          asset: { type: 'string' },
          amount: { type: 'string' },
        },
        required: ['asset', 'amount'],
      },
    };

    const schema = mcpToolToZodSchema(mcpTool);
    expect(schema.safeParse({ asset: 'USDC', amount: '5.00' }).success).toBe(true);
    expect(schema.safeParse({ asset: 'USDC' }).success).toBe(false);
  });
});
