import { z } from 'zod';

export const FindPaymentPathsSchema = z.object({
  sourceAccount: z.string().min(56).max(56).describe('Sender Stellar account address (G...)'),
  destinationAccount: z.string().min(56).max(56).describe('Recipient Stellar account address (G...)'),
  destinationAsset: z.string().describe('Destination asset format "native" or "CODE:ISSUER"'),
  destinationAmount: z.string().describe('Amount recipient must receive (e.g. "10.00")'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export const SubmitTransactionSchema = z.object({
  signedEnvelopeXdr: z.string().min(1).describe('Base64-encoded signed transaction envelope XDR'),
  network: z.enum(['testnet', 'pubnet']).default('testnet'),
});

export async function handleFindPaymentPaths(
  args: z.infer<typeof FindPaymentPathsSchema>,
  horizonUrl: string
) {
  try {
    const url = new URL(`${horizonUrl}/paths/strict-receive`);
    url.searchParams.set('source_account', args.sourceAccount);
    url.searchParams.set('destination_account', args.destinationAccount);
    url.searchParams.set('destination_amount', args.destinationAmount);

    if (args.destinationAsset === 'native' || args.destinationAsset === 'XLM') {
      url.searchParams.set('destination_asset_type', 'native');
    } else {
      const [code, issuer] = args.destinationAsset.split(':');
      if (!code || !issuer) {
        return { error: 'Invalid destinationAsset format. Use "native" or "CODE:ISSUER"' };
      }
      url.searchParams.set(
        'destination_asset_type',
        code.length <= 4 ? 'credit_alphanum4' : 'credit_alphanum12'
      );
      url.searchParams.set('destination_asset_code', code);
      url.searchParams.set('destination_asset_issuer', issuer);
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      return { error: `Horizon error: ${res.statusText}` };
    }
    const data: any = await res.json();
    const records = data._embedded?.records || [];

    return {
      destinationAsset: args.destinationAsset,
      destinationAmount: args.destinationAmount,
      availablePaths: records.map((r: any) => ({
        sourceAsset: r.source_asset_type === 'native' ? 'XLM' : `${r.source_asset_code}:${r.source_asset_issuer}`,
        sourceAmount: r.source_amount,
        path: r.path.map((p: any) => (p.asset_type === 'native' ? 'XLM' : `${p.asset_code}:${p.asset_issuer}`)),
      })),
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function handleSubmitTransaction(
  args: z.infer<typeof SubmitTransactionSchema>,
  horizonUrl: string
) {
  try {
    const formData = new URLSearchParams();
    formData.set('tx', args.signedEnvelopeXdr);

    const res = await fetch(`${horizonUrl}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data: any = await res.json();
    if (!res.ok) {
      return {
        error: 'Transaction failed',
        detail: data.extras?.result_codes || data.detail || data.title,
      };
    }

    return {
      hash: data.hash,
      ledger: data.ledger,
      successful: data.successful,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
