import { z } from 'zod';
import { Address, xdr } from '@stellar/stellar-sdk';

export const SimulateContractSchema = z.object({
  contractId: z.string().min(56).max(56).describe('Soroban Contract ID (C...)'),
  method: z.string().min(1).describe('Contract method name'),
  args: z.array(z.any()).default([]).describe('Method arguments'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export const GetLedgerEntriesSchema = z.object({
  keys: z.array(z.string()).optional().describe('Array of base64-encoded LedgerKey XDR strings'),
  contractId: z.string().min(56).max(56).optional().describe('Soroban Contract ID (C...) to inspect'),
  keySymbol: z.string().optional().describe('Storage key symbol name (e.g. "counter", "admin") or defaults to contract instance'),
  durability: z.enum(['persistent', 'temporary']).default('persistent').describe('Storage durability'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
}).refine(
  (data) => (data.keys && data.keys.length > 0) || data.contractId,
  { message: 'Either "keys" or "contractId" must be provided' }
);

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

export async function handleGetLedgerEntries(
  args: z.infer<typeof GetLedgerEntriesSchema>,
  sorobanRpcUrl: string
) {
  try {
    let targetKeys: string[] = [];

    if (args.keys && args.keys.length > 0) {
      targetKeys = args.keys;
    } else if (args.contractId) {
      const address = new Address(args.contractId);
      const scKey = args.keySymbol
        ? xdr.ScVal.scvSymbol(args.keySymbol)
        : xdr.ScVal.scvLedgerKeyContractInstance();

      const contractDurability =
        args.durability === 'temporary'
          ? xdr.ContractDataDurability.temporary()
          : xdr.ContractDataDurability.persistent();

      const ledgerKey = xdr.LedgerKey.contractData(
        new xdr.LedgerKeyContractData({
          contract: address.toScAddress(),
          key: scKey,
          durability: contractDurability,
        })
      );

      targetKeys = [ledgerKey.toXDR('base64')];
    }

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getLedgerEntries',
      params: {
        keys: targetKeys,
      },
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

    return {
      latestLedger: data.result?.latestLedger,
      entries: data.result?.entries || [],
      queriedKeys: targetKeys,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
