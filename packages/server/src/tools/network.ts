import { z } from 'zod';

export const GetLatestLedgerSchema = z.object({
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleGetLatestLedger(
  _args: z.infer<typeof GetLatestLedgerSchema>,
  sorobanRpcUrl: string
) {
  try {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestLedger',
      params: {},
    };

    const res = await fetch(sorobanRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();
    if (data.error) {
      return {
        error: data.error.message || 'Soroban RPC error',
        code: data.error.code,
      };
    }

    const result = data.result || {};
    return {
      id: result.id,
      protocolVersion: result.protocolVersion,
      sequence: result.sequence,
      ...result,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
