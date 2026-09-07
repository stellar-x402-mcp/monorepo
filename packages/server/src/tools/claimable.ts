import { z } from 'zod';
import {
  Account,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

export const GetClaimableBalancesSchema = z.object({
  claimant: z.string().min(56).max(56).optional().describe('Filter by claimant Stellar account address (G...)'),
  sponsor: z.string().min(56).max(56).optional().describe('Filter by sponsor Stellar account address (G...)'),
  asset: z.string().optional().describe('Filter by asset format "native" or "CODE:ISSUER"'),
  balanceId: z.string().optional().describe('Specific claimable balance ID to query'),
  buildClaimEnvelope: z.boolean().default(false).describe('If true and claimant provided, builds unsigned claim transaction envelope'),
  cursor: z.string().optional().describe('Pagination cursor'),
  limit: z.number().int().positive().max(200).default(20).describe('Maximum number of records to return (1 to 200)'),
  order: z.enum(['asc', 'desc']).default('desc').describe('Sort order'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleGetClaimableBalances(
  args: z.infer<typeof GetClaimableBalancesSchema>,
  horizonUrl: string
) {
  try {
    if (args.balanceId) {
      const url = `${horizonUrl}/claimable_balances/${args.balanceId}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errText = await res.text();
        return { error: `Horizon error (${res.status}): ${errText}` };
      }
      const data: any = await res.json();

      let unsignedEnvelopeXdr: string | undefined;
      if (args.buildClaimEnvelope && args.claimant) {
        const accRes = await fetch(`${horizonUrl}/accounts/${args.claimant}`);
        if (!accRes.ok) {
          const accErr = await accRes.text();
          return { error: `Failed to fetch claimant account (${accRes.status}): ${accErr}` };
        }
        const accData: any = await accRes.json();
        const account = new Account(args.claimant, accData.sequence);
        const passphrase = args.network === 'pubnet' ? Networks.PUBLIC : Networks.TESTNET;

        const op = Operation.claimClaimableBalance({
          balanceId: args.balanceId,
        });

        const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: passphrase })
          .addOperation(op)
          .setTimeout(180)
          .build();

        unsignedEnvelopeXdr = tx.toXDR();
      }

      return {
        id: data.id,
        asset: data.asset,
        amount: data.amount,
        sponsor: data.sponsor,
        claimants: data.claimants,
        lastModifiedLedger: data.last_modified_ledger,
        lastModifiedTime: data.last_modified_time,
        flags: data.flags,
        unsignedEnvelopeXdr,
      };
    }

    const url = new URL(`${horizonUrl}/claimable_balances`);
    url.searchParams.set('limit', String(args.limit));
    url.searchParams.set('order', args.order);

    if (args.claimant) url.searchParams.set('claimant', args.claimant);
    if (args.sponsor) url.searchParams.set('sponsor', args.sponsor);
    if (args.asset) url.searchParams.set('asset', args.asset);
    if (args.cursor) url.searchParams.set('cursor', args.cursor);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const errText = await res.text();
      return { error: `Horizon error (${res.status}): ${errText}` };
    }

    const data: any = await res.json();
    const records = data._embedded?.records || [];

    const balances = records.map((b: any) => ({
      id: b.id,
      asset: b.asset,
      amount: b.amount,
      sponsor: b.sponsor,
      claimants: b.claimants,
      lastModifiedLedger: b.last_modified_ledger,
      lastModifiedTime: b.last_modified_time,
      flags: b.flags,
      pagingToken: b.paging_token,
    }));

    return {
      count: balances.length,
      records: balances,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
