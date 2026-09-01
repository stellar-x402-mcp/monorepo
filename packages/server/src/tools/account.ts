import { z } from 'zod';

export const GetBalanceSchema = z.object({
  accountAddress: z.string().min(56).max(56).describe('Stellar account address (G...)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export const GetAccountSchema = z.object({
  accountAddress: z.string().min(56).max(56).describe('Stellar account address (G...)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export async function handleGetBalance(args: z.infer<typeof GetBalanceSchema>, horizonUrl: string) {
  try {
    const res = await fetch(`${horizonUrl}/accounts/${args.accountAddress}`);
    if (!res.ok) {
      if (res.status === 404) {
        return { error: 'Account not funded / not found on ledger' };
      }
      return { error: `Horizon error: ${res.statusText}` };
    }
    const data: any = await res.json();
    return {
      account: args.accountAddress,
      balances: data.balances.map((b: any) => ({
        asset: b.asset_type === 'native' ? 'XLM' : `${b.asset_code}:${b.asset_issuer}`,
        balance: b.balance,
      })),
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
