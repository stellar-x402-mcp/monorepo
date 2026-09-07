import { z } from 'zod';
import { Address, Networks, TransactionBuilder, rpc, scValToNative, xdr } from '@stellar/stellar-sdk';

export const SimulateContractSchema = z.object({
  contractId: z.string().min(56).max(56).optional().describe('Soroban Contract ID (C...)'),
  method: z.string().min(1).optional().describe('Contract method name'),
  args: z.array(z.any()).default([]).describe('Method arguments'),
  transactionXdr: z.string().optional().describe('Base64-encoded TransactionEnvelope XDR to simulate'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
}).refine(
  (data) => data.transactionXdr || (data.contractId && data.method),
  { message: 'Either "transactionXdr" or both "contractId" and "method" must be provided' }
);

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
    const params: Record<string, any> = {};
    if (args.transactionXdr) {
      params.transaction = args.transactionXdr;
    } else {
      params.contractId = args.contractId;
      params.method = args.method;
      params.args = args.args;
    }

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params,
    };

    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();
    if (data.error) {
      return {
        error: data.error.message || 'Soroban RPC simulation error',
        code: data.error.code,
      };
    }

    const result = data.result || data || {};
    const cost = result.cost || {};
    const firstResult = result.results?.[0] || {};

    return {
      contractId: args.contractId,
      method: args.method,
      minResourceFee: result.minResourceFee,
      cpuInstructions: cost.cpuInsns ? Number(cost.cpuInsns) : undefined,
      memoryBytes: cost.memBytes ? Number(cost.memBytes) : undefined,
      returnValueXdr: firstResult.xdr,
      auth: firstResult.auth || [],
      transactionData: result.transactionData,
      events: result.events || [],
      latestLedger: result.latestLedger,
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

export const GetTransactionSchema = z.object({
  hash: z.string().length(64).describe('Hex-encoded transaction hash (64 characters)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleGetTransaction(
  args: z.infer<typeof GetTransactionSchema>,
  sorobanRpcUrl: string
) {
  try {
    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: {
        hash: args.hash,
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

    const result = data.result || {};
    return {
      status: result.status,
      latestLedger: result.latestLedger,
      latestLedgerCloseTime: result.latestLedgerCloseTime,
      oldestLedger: result.oldestLedger,
      oldestLedgerCloseTime: result.oldestLedgerCloseTime,
      ledger: result.ledger,
      createdAt: result.createdAt,
      applicationOrder: result.applicationOrder,
      feeBump: result.feeBump,
      envelopeXdr: result.envelopeXdr,
      resultXdr: result.resultXdr,
      resultMetaXdr: result.resultMetaXdr,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export const AssembleTransactionSchema = z.object({
  transactionXdr: z.string().min(1).describe('Base64-encoded un-assembled Soroban TransactionEnvelope XDR'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleAssembleTransaction(
  args: z.infer<typeof AssembleTransactionSchema>,
  sorobanRpcUrl: string
) {
  try {
    const passphrase =
      args.network === 'pubnet' ? Networks.PUBLIC : Networks.TESTNET;

    const tx = TransactionBuilder.fromXDR(args.transactionXdr, passphrase);
    const server = new rpc.Server(sorobanRpcUrl);
    const preparedTx = await server.prepareTransaction(tx);

    return {
      assembledTransactionXdr: preparedTx.toXDR(),
      fee: preparedTx.fee,
      source: preparedTx.source,
      sequence: preparedTx.sequence,
      network: args.network,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export function formatDecodedValue(val: any): any {
  if (typeof val === 'bigint') {
    return val.toString();
  }
  if (val instanceof Map) {
    const obj: Record<string, any> = {};
    for (const [k, v] of val.entries()) {
      obj[String(k)] = formatDecodedValue(v);
    }
    return obj;
  }
  if (Array.isArray(val)) {
    return val.map(formatDecodedValue);
  }
  if (val !== null && typeof val === 'object') {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      obj[k] = formatDecodedValue(v);
    }
    return obj;
  }
  return val;
}

export const ReadStorageSchema = z.object({
  contractId: z.string().min(56).max(56).describe('Soroban Contract ID (C...)'),
  key: z.string().optional().describe('Storage key name, user address, or ScVal XDR'),
  keyType: z.enum(['symbol', 'address', 'sac_balance', 'instance', 'raw_scval_xdr']).default('symbol').describe('Type of storage key'),
  userAddress: z.string().optional().describe('Account address (G...) when querying sac_balance'),
  durability: z.enum(['persistent', 'temporary']).default('persistent').describe('Storage durability'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleReadStorage(
  args: z.infer<typeof ReadStorageSchema>,
  sorobanRpcUrl: string
) {
  try {
    const address = new Address(args.contractId);
    const contractDurability =
      args.durability === 'temporary'
        ? xdr.ContractDataDurability.temporary()
        : xdr.ContractDataDurability.persistent();

    let scKey: xdr.ScVal;

    if (args.keyType === 'instance' || (!args.key && !args.userAddress && args.keyType !== 'sac_balance')) {
      scKey = xdr.ScVal.scvLedgerKeyContractInstance();
    } else if (args.keyType === 'sac_balance') {
      const user = args.userAddress || args.key;
      if (!user) {
        return { error: 'userAddress or key must be provided when querying sac_balance' };
      }
      scKey = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Balance'),
        new Address(user).toScVal(),
      ]);
    } else if (args.keyType === 'address') {
      if (!args.key) {
        return { error: 'key must be provided when keyType is address' };
      }
      scKey = new Address(args.key).toScVal();
    } else if (args.keyType === 'raw_scval_xdr') {
      if (!args.key) {
        return { error: 'key must be provided when keyType is raw_scval_xdr' };
      }
      scKey = xdr.ScVal.fromXDR(args.key, 'base64');
    } else {
      if (!args.key) {
        return { error: 'key must be provided when keyType is symbol' };
      }
      scKey = xdr.ScVal.scvSymbol(args.key);
    }

    const ledgerKey = xdr.LedgerKey.contractData(
      new xdr.LedgerKeyContractData({
        contract: address.toScAddress(),
        key: scKey,
        durability: contractDurability,
      })
    );

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getLedgerEntries',
      params: {
        keys: [ledgerKey.toXDR('base64')],
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

    const entries = data.result?.entries || [];
    if (entries.length === 0) {
      return {
        found: false,
        contractId: args.contractId,
        key: args.key,
        keyType: args.keyType,
        message: 'Storage entry not found for specified key and contract',
      };
    }

    const entry = entries[0];
    const parsedData = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64');
    const contractData = parsedData.contractData();
    const rawValScVal = contractData.val();
    const nativeVal = scValToNative(rawValScVal);
    const decodedValue = formatDecodedValue(nativeVal);

    return {
      found: true,
      contractId: args.contractId,
      key: args.key,
      keyType: args.keyType,
      durability: args.durability,
      decodedValue,
      valXdr: rawValScVal.toXDR('base64'),
      lastModifiedLedgerSeq: entry.lastModifiedLedgerSeq,
      liveUntilLedgerSeq: entry.liveUntilLedgerSeq,
      latestLedger: data.result?.latestLedger,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
