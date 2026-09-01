import { z } from 'zod';

export const SimulateContractSchema = z.object({
  contractId: z.string().min(56).max(56).describe('Soroban Contract ID (C...)'),
  method: z.string().min(1).describe('Contract method name'),
  args: z.array(z.any()).default([]).describe('Method arguments'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export async function handleSimulateContract(args: z.infer<typeof SimulateContractSchema>, rpcUrl: string) {
  try {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: {
        contractId: args.contractId,
        method: args.method,
      },
    };

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();
    return {
      contractId: args.contractId,
      method: args.method,
      simulatedResult: data.result || data,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
