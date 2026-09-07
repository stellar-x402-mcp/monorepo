import { z } from 'zod';

export const GetBalanceSchema = z.object({
  accountAddress: z.string().min(56).max(56).describe('Stellar account address (G...)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export const GetAccountSchema = z.object({
  accountAddress: z.string().min(56).max(56).describe('Stellar account address (G...)'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export const GetAccountDetailsSchema = GetAccountSchema;

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

export async function handleGetAccountDetails(
  args: z.infer<typeof GetAccountDetailsSchema>,
  horizonUrl: string
) {
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
      sequence: data.sequence,
      sequenceLedger: data.sequence_ledger,
      subentryCount: data.subentry_count,
      inflationDestination: data.inflation_destination,
      homeDomain: data.home_domain,
      lastModifiedLedger: data.last_modified_ledger,
      lastModifiedTime: data.last_modified_time,
      thresholds: data.thresholds,
      flags: data.flags,
      balances: data.balances.map((b: any) => ({
        asset: b.asset_type === 'native' ? 'XLM' : `${b.asset_code}:${b.asset_issuer}`,
        assetType: b.asset_type,
        balance: b.balance,
        limit: b.limit,
        buyingLiabilities: b.buying_liabilities,
        sellingLiabilities: b.selling_liabilities,
      })),
      signers: data.signers.map((s: any) => ({
        key: s.key,
        weight: s.weight,
        type: s.type,
      })),
      numSponsoring: data.num_sponsoring,
      numSponsored: data.num_sponsored,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
