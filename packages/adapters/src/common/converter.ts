import { z } from 'zod';

/**
 * Converts a JSON Schema property descriptor into a corresponding Zod type.
 */
export function jsonSchemaPropertyToZod(prop: Record<string, unknown>): z.ZodTypeAny {
  const type = prop.type as string | undefined;
  let schema: z.ZodTypeAny;

  switch (type) {
    case 'string':
      if (Array.isArray(prop.enum) && prop.enum.length > 0) {
        const enumValues = prop.enum as [string, ...string[]];
        schema = z.enum(enumValues);
      } else {
        schema = z.string();
      }
      break;
    case 'number':
    case 'integer':
      schema = z.number();
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'array':
      if (prop.items && typeof prop.items === 'object') {
        schema = z.array(jsonSchemaPropertyToZod(prop.items as Record<string, unknown>));
      } else {
        schema = z.array(z.unknown());
      }
      break;
    case 'object':
      if (prop.properties && typeof prop.properties === 'object') {
        schema = jsonSchemaToZod(prop);
      } else {
        schema = z.record(z.unknown());
      }
      break;
    default:
      schema = z.unknown();
      break;
  }

  if (typeof prop.description === 'string') {
    schema = schema.describe(prop.description);
  }

  return schema;
}

/**
 * Converts a JSON Schema object containing properties and required fields into a Zod object schema.
 */
export function jsonSchemaToZod(jsonSchema?: Record<string, unknown>): z.ZodObject<Record<string, z.ZodTypeAny>> {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.object({});
  }

  const rawProperties = (jsonSchema.properties || {}) as Record<string, Record<string, unknown>>;
  const requiredFields = new Set<string>(
    Array.isArray(jsonSchema.required) ? (jsonSchema.required as string[]) : []
  );

  const shape: Record<string, z.ZodTypeAny> = {};

  for (const [key, propDef] of Object.entries(rawProperties)) {
    let propSchema = jsonSchemaPropertyToZod(propDef);
    if (!requiredFields.has(key)) {
      propSchema = propSchema.optional();
    }
    shape[key] = propSchema;
  }

  return z.object(shape);
}

/**
 * Converts an MCP tool definition into a UnifiedAgentTool parameter Zod schema.
 */
export function mcpToolToZodSchema(tool: { inputSchema?: Record<string, unknown> }): z.ZodObject<Record<string, z.ZodTypeAny>> {
  return jsonSchemaToZod(tool.inputSchema);
}
