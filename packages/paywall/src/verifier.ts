import { Networks, TransactionBuilder, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';

export interface VerifierConfig {
  network?: 'stellar:testnet' | 'stellar:pubnet';
  horizonUrl?: string;
  sorobanRpcUrl?: string;
}

export interface VerifyPaymentOptions {
  expectedRecipient: string;
  expectedPrice: string;
  expectedAsset?: string | undefined;
  expectedMemo?: string | undefined;
  maxAgeSeconds?: number | undefined;
}

export interface VerificationResult {
  verified: boolean;
  txHash?: string;
  payer?: string;
  recipient?: string;
  asset?: string;
  amount?: string;
  ledger?: number;
  createdAt?: string;
  error?: string;
}

export class OnChainTransactionVerifier {
  private networkPassphrase: string;
  private horizonUrl: string;
  private sorobanRpcUrl: string;

  constructor(config?: VerifierConfig) {
    const isPubnet = config?.network === 'stellar:pubnet';
    this.networkPassphrase = isPubnet ? Networks.PUBLIC : Networks.TESTNET;
    this.horizonUrl = config?.horizonUrl || (isPubnet ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org');
    this.sorobanRpcUrl = config?.sorobanRpcUrl || (isPubnet ? 'https://soroban-rpc.mainnet.stellar.org' : 'https://soroban-testnet.stellar.org');
  }

  /**
   * Verifies an on-chain transaction by its transaction hash against Horizon and Soroban RPC
   */
  async verifyTransactionHash(
    txHash: string,
    options: VerifyPaymentOptions
  ): Promise<VerificationResult> {
    try {
      // 1. Check Horizon for transaction details
      const txRes = await fetch(`${this.horizonUrl}/transactions/${txHash}`);
      if (!txRes.ok) {
        if (txRes.status === 404) {
          // Fall back to Soroban RPC getTransaction in case of recent Soroban tx
          return await this.verifySorobanRpcHash(txHash, options);
        }
        return {
          verified: false,
          txHash,
          error: `Horizon transaction query failed: ${txRes.status} ${txRes.statusText}`,
        };
      }

      const txData: any = await txRes.json();
      if (!txData.successful) {
        return {
          verified: false,
          txHash,
          error: 'Transaction failed on-chain',
        };
      }

      // Check max age if configured
      if (options.maxAgeSeconds && txData.created_at) {
        const txTime = new Date(txData.created_at).getTime();
        const now = Date.now();
        if (now - txTime > options.maxAgeSeconds * 1000) {
          return {
            verified: false,
            txHash,
            error: `Transaction expired: older than ${options.maxAgeSeconds} seconds`,
          };
        }
      }

      // Check memo if expected
      if (options.expectedMemo && txData.memo !== options.expectedMemo) {
        return {
          verified: false,
          txHash,
          error: `Memo mismatch: expected "${options.expectedMemo}", found "${txData.memo || ''}"`,
        };
      }

      // 2. Query operations to verify payment recipient and amount
      const opsRes = await fetch(`${this.horizonUrl}/transactions/${txHash}/operations`);
      if (!opsRes.ok) {
        return {
          verified: false,
          txHash,
          error: `Failed to query operations for transaction ${txHash}`,
        };
      }

      const opsData: any = await opsRes.json();
      const records = opsData._embedded?.records || [];

      for (const op of records) {
        if (op.type === 'payment' || op.type === 'path_payment_strict_receive' || op.type === 'path_payment_strict_send') {
          const recipient = op.to || op.destination;
          const opAsset = op.asset_type === 'native' ? 'native' : `${op.asset_code}:${op.asset_issuer}`;
          const amount = op.amount || op.dest_amount;

          const isRecipientMatch = recipient === options.expectedRecipient;
          const isAssetMatch = !options.expectedAsset || options.expectedAsset === 'native'
            ? (opAsset === 'native' || opAsset === 'XLM')
            : (opAsset === options.expectedAsset || op.asset_code === options.expectedAsset);

          const isAmountSufficient = parseFloat(amount) >= parseFloat(options.expectedPrice);

          if (isRecipientMatch && isAssetMatch && isAmountSufficient) {
            return {
              verified: true,
              txHash,
              payer: op.from || op.source_account,
              recipient,
              asset: opAsset,
              amount,
              ledger: txData.ledger,
              createdAt: txData.created_at,
            };
          }
        }
      }

      return {
        verified: false,
        txHash,
        error: `No matching payment operation found for recipient ${options.expectedRecipient} and amount >= ${options.expectedPrice}`,
      };
    } catch (err: any) {
      return {
        verified: false,
        txHash,
        error: `Verification exception: ${err.message}`,
      };
    }
  }

  /**
   * Verifies a signed TransactionEnvelope XDR before or upon network submission
   */
  async verifyEnvelopeXdr(
    envelopeXdr: string,
    options: VerifyPaymentOptions
  ): Promise<VerificationResult> {
    try {
      const genericTx = TransactionBuilder.fromXDR(envelopeXdr, this.networkPassphrase);
      let tx: Transaction;
      if (genericTx instanceof FeeBumpTransaction) {
        tx = genericTx.innerTransaction;
      } else {
        tx = genericTx;
      }

      const txHash = tx.hash().toString('hex');

      // Verify signatures present
      if (!tx.signatures || tx.signatures.length === 0) {
        return {
          verified: false,
          txHash,
          error: 'Transaction envelope has no signatures',
        };
      }

      // Check timebounds if present
      if (tx.timeBounds) {
        const now = Math.floor(Date.now() / 1000);
        const minTime = parseInt(tx.timeBounds.minTime, 10);
        const maxTime = parseInt(tx.timeBounds.maxTime, 10);
        if (minTime > 0 && now < minTime) {
          return {
            verified: false,
            txHash,
            error: 'Transaction is not yet valid (timebounds minTime in future)',
          };
        }
        if (maxTime > 0 && now > maxTime) {
          return {
            verified: false,
            txHash,
            error: 'Transaction has expired (timebounds maxTime in past)',
          };
        }
      }

      // Check memo
      if (options.expectedMemo) {
        const memoValue = tx.memo.value ? tx.memo.value.toString() : '';
        if (memoValue !== options.expectedMemo) {
          return {
            verified: false,
            txHash,
            error: `Memo mismatch: expected "${options.expectedMemo}", found "${memoValue}"`,
          };
        }
      }

      // Check operations
      for (const op of tx.operations) {
        if (op.type === 'payment') {
          const recipient = op.destination;
          const opAsset = op.asset.isNative() ? 'native' : `${op.asset.getCode()}:${op.asset.getIssuer()}`;
          const amount = op.amount;

          const isRecipientMatch = recipient === options.expectedRecipient;
          const isAssetMatch = !options.expectedAsset || options.expectedAsset === 'native'
            ? (opAsset === 'native' || opAsset === 'XLM')
            : (opAsset === options.expectedAsset || (op.asset.getCode && op.asset.getCode() === options.expectedAsset));

          const isAmountSufficient = parseFloat(amount) >= parseFloat(options.expectedPrice);

          if (isRecipientMatch && isAssetMatch && isAmountSufficient) {
            return {
              verified: true,
              txHash,
              payer: tx.source,
              recipient,
              asset: opAsset,
              amount,
            };
          }
        }
      }

      return {
        verified: false,
        txHash,
        error: `No valid payment operation found matching recipient ${options.expectedRecipient} and amount >= ${options.expectedPrice}`,
      };
    } catch (err: any) {
      return {
        verified: false,
        error: `Envelope parsing failed: ${err.message}`,
      };
    }
  }

  /**
   * Fallback check for Soroban transactions via Soroban RPC getTransaction
   */
  private async verifySorobanRpcHash(
    txHash: string,
    options: VerifyPaymentOptions
  ): Promise<VerificationResult> {
    try {
      const res = await fetch(this.sorobanRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: { hash: txHash },
        }),
      });

      if (!res.ok) {
        return {
          verified: false,
          txHash,
          error: `Soroban RPC query failed: ${res.status} ${res.statusText}`,
        };
      }

      const data: any = await res.json();
      if (data.error) {
        return {
          verified: false,
          txHash,
          error: data.error.message || 'Soroban RPC error',
        };
      }

      const txResult = data.result;
      if (!txResult || txResult.status !== 'SUCCESS') {
        return {
          verified: false,
          txHash,
          error: `Soroban transaction status is ${txResult?.status || 'NOT_FOUND'}`,
        };
      }

      return {
        verified: true,
        txHash,
        ledger: txResult.latestLedger,
        createdAt: txResult.createdAt,
      };
    } catch (err: any) {
      return {
        verified: false,
        txHash,
        error: `Soroban verification error: ${err.message}`,
      };
    }
  }
}
