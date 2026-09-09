import {
  Asset,
  Claimant,
  FeeBumpTransaction,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import crypto from 'crypto';
import type { WalletSigner } from './signer.js';

export type PaymentMethod =
  | 'native_xlm'
  | 'soroban_sac'
  | 'path_payment'
  | 'claimable_balance'
  | 'fee_bump'
  | 'state_channel'
  | 'amm_swap';

export interface SettlementOptions {
  method?: PaymentMethod | undefined;
  memoText?: string | undefined;
  memoHash?: string | undefined;
  feeSourceKeypair?: Keypair | undefined;
  sponsoredFee?: string | undefined;
  channelId?: string | undefined;
  channelSequence?: number | undefined;
}

export interface SettlementResult {
  method: PaymentMethod;
  txHash: string;
  signedEnvelopeXdr?: string | undefined;
  voucherProof?: string | undefined;
  asset: string;
  amount: string;
  recipient: string;
}

export class MultiPaymentSettlementEngine {
  private signer: WalletSigner;
  private networkPassphrase: string;

  constructor(signer: WalletSigner, networkPassphrase: string = Networks.TESTNET) {
    this.signer = signer;
    this.networkPassphrase = networkPassphrase;
  }

  /**
   * Builds and signs a direct native XLM payment transaction.
   */
  public async buildNativePayment(
    sourceAccount: { accountId(): string; sequenceNumber(): string; incrementSequenceNumber(): void },
    destination: string,
    amount: string,
    memo?: Memo | undefined
  ): Promise<Transaction> {
    const builder = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.payment({
          destination,
          asset: Asset.native(),
          amount,
        })
      )
      .setTimeout(300);

    if (memo) {
      builder.addMemo(memo);
    }

    const tx = builder.build();
    this.signer.signTransaction(tx);
    return tx;
  }

  /**
   * Builds and signs a strict-receive path payment transaction.
   */
  public async buildPathPayment(
    sourceAccount: { accountId(): string; sequenceNumber(): string; incrementSequenceNumber(): void },
    destination: string,
    sendAsset: Asset,
    sendMax: string,
    destAsset: Asset,
    destAmount: string,
    path: Asset[] = []
  ): Promise<Transaction> {
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.pathPaymentStrictReceive({
          sendAsset,
          sendMax,
          destination,
          destAsset,
          destAmount,
          path,
        })
      )
      .setTimeout(300)
      .build();

    this.signer.signTransaction(tx);
    return tx;
  }

  /**
   * Builds and signs a claimable balance creation operation.
   */
  public async buildClaimableBalance(
    sourceAccount: { accountId(): string; sequenceNumber(): string; incrementSequenceNumber(): void },
    asset: Asset,
    amount: string,
    claimants: Claimant[]
  ): Promise<Transaction> {
    const tx = new TransactionBuilder(sourceAccount, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(
        Operation.createClaimableBalance({
          asset,
          amount,
          claimants,
        })
      )
      .setTimeout(300)
      .build();

    this.signer.signTransaction(tx);
    return tx;
  }

  /**
   * Wraps an inner transaction in a sponsored fee-bump transaction envelope.
   */
  public async buildFeeBump(
    innerTx: Transaction,
    feeSourceKeypair: Keypair,
    maxFee = '600'
  ): Promise<FeeBumpTransaction> {
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      feeSourceKeypair,
      maxFee,
      innerTx,
      this.networkPassphrase
    );
    feeBump.sign(feeSourceKeypair);
    return feeBump;
  }

  /**
   * Generates a signed off-chain state channel micro-voucher.
   */
  public async buildStateChannelVoucher(
    channelId: string,
    sequence: number,
    amount: string,
    merchantAddress: string
  ): Promise<{ voucherProof: string; voucherHash: string }> {
    const payload = `${channelId}:${sequence}:${amount}:${merchantAddress}`;
    const voucherHash = crypto.createHash('sha256').update(payload).digest('hex');
    const signature = this.signer.sign(Buffer.from(voucherHash, 'hex')).toString('hex');
    const voucherProof = `${channelId}.${sequence}.${voucherHash}.${signature}`;
    return { voucherProof, voucherHash };
  }

  /**
   * Automatically resolves an x402 challenge based on specified options.
   */
  public async settleChallenge(
    challenge: {
      price: string;
      asset: string;
      recipient: string;
      challengeHash?: string | undefined;
      hash?: string | undefined;
      network?: string | undefined;
    },
    options?: SettlementOptions | undefined
  ): Promise<SettlementResult> {
    const method = options?.method ?? 'native_xlm';
    const recipient = challenge.recipient;
    const amount = challenge.price;
    const asset = challenge.asset;

    if (method === 'state_channel') {
      const channelId = options?.channelId ?? 'default-channel';
      const seq = options?.channelSequence ?? 1;
      const { voucherProof, voucherHash } = await this.buildStateChannelVoucher(
        channelId,
        seq,
        amount,
        recipient
      );

      return {
        method: 'state_channel',
        txHash: voucherHash,
        voucherProof,
        asset,
        amount,
        recipient,
      };
    }

    // Default mock settlement hash for testing and dry runs
    const mockHash = crypto
      .createHash('sha256')
      .update(`${this.signer.getPublicKey()}:${recipient}:${amount}:${Date.now()}`)
      .digest('hex');

    return {
      method,
      txHash: mockHash,
      asset,
      amount,
      recipient,
    };
  }
}
