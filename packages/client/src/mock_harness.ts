import crypto from 'crypto';
import type { WalletSigner } from './signer.js';

export interface MockPaymentHarnessConfig {
  networkPassphrase?: string;
  simulatedLatencyMs?: number;
  failureRate?: number;
  defaultBalance?: number;
}

export interface MockPaymentRecord {
  txHash: string;
  from: string;
  to: string;
  amount: number;
  asset: string;
  rail: 'native' | 'sac' | 'state-channel';
  timestamp: number;
  memo?: string | undefined;
}

export interface MockChannelState {
  channelId: string;
  payer: string;
  merchant: string;
  deposited: number;
  claimed: number;
  lastNonce: number;
  status: 'open' | 'closed';
  createdAt: number;
}

export interface MockChallenge402 {
  status: 402;
  headers: Record<string, string>;
  body: {
    error: string;
    code: number;
    amount: number;
    asset: string;
    recipient: string;
    rail: 'native' | 'sac' | 'state-channel';
    challengeId: string;
    memo?: string | undefined;
  };
}

export interface MockVoucher {
  voucherSignature: string;
  channelId: string;
  payer: string;
  merchant: string;
  amount: number;
  nonce: number;
}

/**
 * Zero-Network Mock Payment Harness.
 * Provides in-memory simulation of Stellar x402 payment rails, state channel lifecycle,
 * and HTTP 402 challenges for developer test suites and offline CI workflows.
 */
export class MockPaymentHarness {
  private readonly config: Required<MockPaymentHarnessConfig>;
  private readonly balances: Map<string, number> = new Map();
  private readonly channels: Map<string, MockChannelState> = new Map();
  private readonly txHashes: Set<string> = new Set();
  private readonly auditLog: MockPaymentRecord[] = [];

  constructor(config: MockPaymentHarnessConfig = {}) {
    this.config = {
      networkPassphrase: config.networkPassphrase ?? 'Test SDF Network ; September 2015',
      simulatedLatencyMs: Math.max(0, config.simulatedLatencyMs ?? 0),
      failureRate: Math.max(0, Math.min(1.0, config.failureRate ?? 0.0)),
      defaultBalance: config.defaultBalance ?? 1000.0,
    };
  }

  /**
   * Set or override the balance for a Stellar address.
   */
  public setBalance(address: string, amount: number): void {
    if (amount < 0) {
      throw new Error('Balance cannot be negative');
    }
    this.balances.set(address, amount);
  }

  /**
   * Retrieve current balance. Defaults to defaultBalance if uninitialized.
   */
  public getBalance(address: string): number {
    if (!this.balances.has(address)) {
      this.balances.set(address, this.config.defaultBalance);
    }
    return this.balances.get(address)!;
  }

  /**
   * Construct an RFC-compliant HTTP 402 Payment Required challenge.
   */
  public create402Challenge(
    recipient: string,
    amount: number,
    asset: string = 'XLM',
    rail: 'native' | 'sac' | 'state-channel' = 'native',
    memo?: string
  ): MockChallenge402 {
    const challengeId = `chal_${crypto.randomBytes(8).toString('hex')}`;
    return {
      status: 402,
      headers: {
        'x-payment-required': 'true',
        'x-payment-recipient': recipient,
        'x-payment-amount': amount.toFixed(7),
        'x-payment-asset': asset,
        'x-payment-rail': rail,
        'x-payment-challenge-id': challengeId,
      },
      body: {
        error: 'Payment Required',
        code: 1001,
        amount,
        asset,
        recipient,
        rail,
        challengeId,
        memo,
      },
    };
  }

  /**
   * Settle an HTTP 402 challenge using a provided WalletSigner.
   * Enforces balance sufficiency, optional failure injection, and replay deduping.
   */
  public async settlePayment(
    signer: WalletSigner,
    challenge: MockChallenge402
  ): Promise<{ txHash: string; success: boolean; latencyMs: number }> {
    const startTime = Date.now();
    const payer = signer.getPublicKey();
    const { amount, recipient, asset, rail, memo } = challenge.body;

    // Simulate network latency if configured
    if (this.config.simulatedLatencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.config.simulatedLatencyMs));
    }

    // Injected network failure simulation
    if (this.config.failureRate > 0 && Math.random() < this.config.failureRate) {
      const err = new Error('Simulated upstream network RPC timeout');
      (err as any).code = 1005;
      (err as any).slug = 'ERR_NETWORK_CIRCUIT_OPEN';
      throw err;
    }

    const payerBalance = this.getBalance(payer);
    if (payerBalance < amount) {
      const err = new Error(`Insufficient funds: account ${payer} has ${payerBalance} ${asset}, requested ${amount}`);
      (err as any).code = 1110;
      (err as any).slug = 'ERR_CLIENT_INSUFFICIENT_FUNDS';
      throw err;
    }

    // Deterministic signature payload
    const payload = Buffer.from(
      JSON.stringify({
        challengeId: challenge.body.challengeId,
        payer,
        recipient,
        amount,
        asset,
        network: this.config.networkPassphrase,
      })
    );

    const signature = signer.sign(payload);
    const txHash = crypto.createHash('sha256').update(signature).digest('hex');

    // Anti-replay deduplication
    if (this.txHashes.has(txHash)) {
      const err = new Error(`Replay rejection: transaction hash ${txHash} already settled`);
      (err as any).code = 1160;
      (err as any).slug = 'ERR_REPLAY_TX_HASH_CLAIMED';
      throw err;
    }

    // Atomically transfer funds in memory
    const recipientBalance = this.getBalance(recipient);
    this.balances.set(payer, payerBalance - amount);
    this.balances.set(recipient, recipientBalance + amount);
    this.txHashes.add(txHash);

    const record: MockPaymentRecord = {
      txHash,
      from: payer,
      to: recipient,
      amount,
      asset,
      rail,
      timestamp: Date.now(),
      memo,
    };
    this.auditLog.push(record);

    return {
      txHash,
      success: true,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Open an in-memory Soroban state channel with initial deposit.
   */
  public openStateChannel(payerSigner: WalletSigner, merchant: string, deposit: number): string {
    if (deposit <= 0) {
      throw new Error('Initial state channel deposit must be strictly positive');
    }
    const payer = payerSigner.getPublicKey();
    const payerBalance = this.getBalance(payer);
    if (payerBalance < deposit) {
      const err = new Error(`Cannot open channel: balance ${payerBalance} is below deposit ${deposit}`);
      (err as any).code = 1110;
      (err as any).slug = 'ERR_CLIENT_INSUFFICIENT_FUNDS';
      throw err;
    }

    this.balances.set(payer, payerBalance - deposit);

    const channelId = `chan_${crypto.randomBytes(16).toString('hex')}`;
    this.channels.set(channelId, {
      channelId,
      payer,
      merchant,
      deposited: deposit,
      claimed: 0,
      lastNonce: 0,
      status: 'open',
      createdAt: Date.now(),
    });

    return channelId;
  }

  /**
   * Sign an off-chain micro-payment voucher against an open state channel.
   */
  public signChannelVoucher(
    payerSigner: WalletSigner,
    channelId: string,
    cumulativeAmount: number,
    nonce: number
  ): MockVoucher {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`State channel ${channelId} not found`);
    }
    if (channel.status !== 'open') {
      throw new Error(`State channel ${channelId} is closed`);
    }
    if (channel.payer !== payerSigner.getPublicKey()) {
      throw new Error(`Signer ${payerSigner.getPublicKey()} is not the payer for channel ${channelId}`);
    }
    if (cumulativeAmount > channel.deposited) {
      const err = new Error(`Cumulative voucher amount ${cumulativeAmount} exceeds escrow deposit ${channel.deposited}`);
      (err as any).code = 1171;
      (err as any).slug = 'ERR_CONTRACT_AMOUNT_EXCEEDED';
      throw err;
    }
    if (nonce <= channel.lastNonce) {
      const err = new Error(`Voucher nonce ${nonce} must strictly exceed channel nonce ${channel.lastNonce}`);
      (err as any).code = 1170;
      (err as any).slug = 'ERR_CONTRACT_INVALID_NONCE';
      throw err;
    }

    const payload = Buffer.from(`${channelId}:${channel.merchant}:${cumulativeAmount}:${nonce}`);
    const sig = payerSigner.sign(payload);

    return {
      voucherSignature: sig.toString('hex'),
      channelId,
      payer: channel.payer,
      merchant: channel.merchant,
      amount: cumulativeAmount,
      nonce,
    };
  }

  /**
   * Merchant claims an off-chain voucher to lock in cumulative payout.
   */
  public claimChannelVoucher(
    merchantAddress: string,
    voucher: MockVoucher
  ): { claimed: number; remainingEscrow: number } {
    const channel = this.channels.get(voucher.channelId);
    if (!channel) {
      throw new Error(`State channel ${voucher.channelId} not found`);
    }
    if (channel.status !== 'open') {
      throw new Error(`State channel ${voucher.channelId} is closed`);
    }
    if (channel.merchant !== merchantAddress) {
      throw new Error(`Caller ${merchantAddress} is not authorized merchant for channel ${voucher.channelId}`);
    }
    if (voucher.nonce <= channel.lastNonce) {
      const err = new Error(`Nonce ${voucher.nonce} not greater than last claimed nonce ${channel.lastNonce}`);
      (err as any).code = 1170;
      (err as any).slug = 'ERR_CONTRACT_INVALID_NONCE';
      throw err;
    }
    if (voucher.amount <= channel.claimed) {
      throw new Error(`Voucher amount ${voucher.amount} must exceed current claimed sum ${channel.claimed}`);
    }
    if (voucher.amount > channel.deposited) {
      const err = new Error(`Voucher amount ${voucher.amount} exceeds deposited escrow ${channel.deposited}`);
      (err as any).code = 1171;
      (err as any).slug = 'ERR_CONTRACT_AMOUNT_EXCEEDED';
      throw err;
    }

    // Delta payout to merchant
    const delta = voucher.amount - channel.claimed;
    const currentMerchantBal = this.getBalance(channel.merchant);
    this.balances.set(channel.merchant, currentMerchantBal + delta);

    channel.claimed = voucher.amount;
    channel.lastNonce = voucher.nonce;

    return {
      claimed: channel.claimed,
      remainingEscrow: channel.deposited - channel.claimed,
    };
  }

  /**
   * Close state channel and refund unspent escrow back to payer.
   */
  public closeStateChannel(
    caller: string,
    channelId: string
  ): { payerRefund: number; merchantPayout: number } {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`State channel ${channelId} not found`);
    }
    if (channel.status !== 'open') {
      throw new Error(`State channel ${channelId} is already closed`);
    }
    if (caller !== channel.payer && caller !== channel.merchant) {
      throw new Error(`Unauthorized closure attempt by ${caller}`);
    }

    channel.status = 'closed';
    const refund = channel.deposited - channel.claimed;
    if (refund > 0) {
      const currentPayerBal = this.getBalance(channel.payer);
      this.balances.set(channel.payer, currentPayerBal + refund);
    }

    return {
      payerRefund: refund,
      merchantPayout: channel.claimed,
    };
  }

  /**
   * Get channel status.
   */
  public getChannel(channelId: string): MockChannelState | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get immutable audit history log.
   */
  public getAuditHistory(): readonly MockPaymentRecord[] {
    return [...this.auditLog];
  }

  /**
   * Reset all mock states.
   */
  public reset(): void {
    this.balances.clear();
    this.channels.clear();
    this.txHashes.clear();
    this.auditLog.length = 0;
  }
}
