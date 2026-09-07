import { z } from 'zod';
import {
  Account,
  Asset,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

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

export const SwapTokensSchema = z.object({
  sourceAccount: z.string().min(56).max(56).describe('Sender Stellar account address (G...)'),
  destinationAccount: z.string().min(56).max(56).optional().describe('Recipient address, defaults to sourceAccount (G...)'),
  sendAsset: z.string().describe('Source asset format "native" or "CODE:ISSUER"'),
  sendMax: z.string().describe('Maximum amount of source asset willing to send (e.g. "15.00")'),
  destAsset: z.string().describe('Destination asset format "native" or "CODE:ISSUER"'),
  destAmount: z.string().describe('Exact amount of destination asset to receive (e.g. "10.00")'),
  path: z.array(z.string()).optional().describe('Optional explicit intermediate asset path array'),
  signedEnvelopeXdr: z.string().optional().describe('Optional Base64 signed envelope XDR for execution'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
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

function parseAsset(assetStr: string): Asset {
  if (assetStr === 'native' || assetStr === 'XLM') {
    return Asset.native();
  }
  const [code, issuer] = assetStr.split(':');
  if (!code || !issuer) {
    throw new Error(`Invalid asset format: "${assetStr}". Expected "native" or "CODE:ISSUER"`);
  }
  return new Asset(code, issuer);
}

export async function handleSwapTokens(
  args: z.infer<typeof SwapTokensSchema>,
  horizonUrl: string
) {
  try {
    if (args.signedEnvelopeXdr) {
      return await handleSubmitTransaction(
        { signedEnvelopeXdr: args.signedEnvelopeXdr, network: args.network },
        horizonUrl
      );
    }

    const destination = args.destinationAccount || args.sourceAccount;
    const sendAsset = parseAsset(args.sendAsset);
    const destAsset = parseAsset(args.destAsset);

    let intermediatePath: Asset[] = [];
    if (args.path && args.path.length > 0) {
      intermediatePath = args.path.map(parseAsset);
    } else {
      const pathResult = await handleFindPaymentPaths(
        {
          sourceAccount: args.sourceAccount,
          destinationAccount: destination,
          destinationAsset: args.destAsset,
          destinationAmount: args.destAmount,
          network: args.network,
        },
        horizonUrl
      );

      if ('error' in pathResult && pathResult.error) {
        return { error: `Failed to resolve swap path: ${pathResult.error}` };
      }

      if ('availablePaths' in pathResult && pathResult.availablePaths.length > 0) {
        const matchingPath = pathResult.availablePaths.find((p: any) => {
          const pSource = p.sourceAsset === 'XLM' ? 'native' : p.sourceAsset;
          const reqSource = args.sendAsset === 'XLM' ? 'native' : args.sendAsset;
          return pSource === reqSource;
        });

        if (matchingPath) {
          intermediatePath = matchingPath.path.map((p: string) =>
            p === 'XLM' || p === 'native' ? Asset.native() : parseAsset(p)
          );
        }
      }
    }

    const accountRes = await fetch(`${horizonUrl}/accounts/${args.sourceAccount}`);
    if (!accountRes.ok) {
      return { error: `Source account not found or funded: ${accountRes.statusText}` };
    }
    const accountData: any = await accountRes.json();
    const account = new Account(args.sourceAccount, accountData.sequence);

    const networkPassphrase =
      args.network === 'pubnet' ? Networks.PUBLIC : Networks.TESTNET;

    const tx = new TransactionBuilder(account, {
      fee: '100000',
      networkPassphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset,
          sendMax: args.sendMax,
          destination,
          destAsset,
          destAmount: args.destAmount,
          path: intermediatePath,
        })
      )
      .setTimeout(300)
      .build();

    return {
      status: 'ready_for_signing',
      unsignedEnvelopeXdr: tx.toXDR(),
      sourceAccount: args.sourceAccount,
      destinationAccount: destination,
      sendAsset: args.sendAsset,
      sendMax: args.sendMax,
      destAsset: args.destAsset,
      destAmount: args.destAmount,
      path: intermediatePath.map((a) => (a.isNative() ? 'native' : `${a.getCode()}:${a.getIssuer()}`)),
      network: args.network,
      instructions: 'Sign this transaction envelope with the source account private key and submit using stellar_submit_transaction.',
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
