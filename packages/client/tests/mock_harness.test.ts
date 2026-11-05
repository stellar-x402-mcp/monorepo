import { describe, it, expect, beforeEach } from 'vitest';
import { MockPaymentHarness } from '../src/mock_harness.js';
import { InMemoryWalletSigner } from '../src/signer.js';

describe('MockPaymentHarness - Zero-Network Offline Testing Harness', () => {
  let harness: MockPaymentHarness;
  let payerSigner: InMemoryWalletSigner;
  let merchantSigner: InMemoryWalletSigner;

  beforeEach(() => {
    harness = new MockPaymentHarness({
      defaultBalance: 100.0,
      simulatedLatencyMs: 0,
    });
    payerSigner = InMemoryWalletSigner.random();
    merchantSigner = InMemoryWalletSigner.random();
  });

  it('initializes with default config and balances', () => {
    const payer = payerSigner.getPublicKey();
    expect(harness.getBalance(payer)).toBe(100.0);

    harness.setBalance(payer, 250.5);
    expect(harness.getBalance(payer)).toBe(250.5);
  });

  it('creates RFC-compliant 402 challenge headers and payload', () => {
    const merchant = merchantSigner.getPublicKey();
    const challenge = harness.create402Challenge(merchant, 5.0, 'USDC', 'sac', 'invoice-101');

    expect(challenge.status).toBe(402);
    expect(challenge.headers['x-payment-required']).toBe('true');
    expect(challenge.headers['x-payment-recipient']).toBe(merchant);
    expect(challenge.headers['x-payment-amount']).toBe('5.0000000');
    expect(challenge.headers['x-payment-asset']).toBe('USDC');
    expect(challenge.headers['x-payment-rail']).toBe('sac');
    expect(challenge.body.code).toBe(1001);
    expect(challenge.body.amount).toBe(5.0);
    expect(challenge.body.memo).toBe('invoice-101');
  });

  it('settles 402 payment and transfers balance atomically', async () => {
    const payer = payerSigner.getPublicKey();
    const merchant = merchantSigner.getPublicKey();

    const challenge = harness.create402Challenge(merchant, 10.0, 'XLM', 'native');
    const result = await harness.settlePayment(payerSigner, challenge);

    expect(result.success).toBe(true);
    expect(result.txHash).toBeDefined();
    expect(result.txHash.length).toBe(64);

    expect(harness.getBalance(payer)).toBe(90.0);
    expect(harness.getBalance(merchant)).toBe(110.0);

    const history = harness.getAuditHistory();
    expect(history.length).toBe(1);
    expect(history[0].from).toBe(payer);
    expect(history[0].to).toBe(merchant);
    expect(history[0].amount).toBe(10.0);
  });

  it('throws Error Code 1110 (ERR_CLIENT_INSUFFICIENT_FUNDS) when balance is inadequate', async () => {
    const payer = payerSigner.getPublicKey();
    const merchant = merchantSigner.getPublicKey();

    harness.setBalance(payer, 2.0);
    const challenge = harness.create402Challenge(merchant, 5.0, 'XLM');

    await expect(harness.settlePayment(payerSigner, challenge)).rejects.toMatchObject({
      code: 1110,
      slug: 'ERR_CLIENT_INSUFFICIENT_FUNDS',
    });

    expect(harness.getBalance(payer)).toBe(2.0);
    expect(harness.getBalance(merchant)).toBe(100.0);
  });

  it('throws Error Code 1160 (ERR_REPLAY_TX_HASH_CLAIMED) on duplicate transaction signature', async () => {
    const merchant = merchantSigner.getPublicKey();
    const challenge = harness.create402Challenge(merchant, 1.0, 'XLM');

    // First settlement succeeds
    const first = await harness.settlePayment(payerSigner, challenge);
    expect(first.success).toBe(true);

    // Second identical settlement triggers replay protection
    await expect(harness.settlePayment(payerSigner, challenge)).rejects.toMatchObject({
      code: 1160,
      slug: 'ERR_REPLAY_TX_HASH_CLAIMED',
    });
  });

  it('simulates state channel opening, off-chain voucher signing, claiming, and balance conservation', () => {
    const payer = payerSigner.getPublicKey();
    const merchant = merchantSigner.getPublicKey();

    // Open channel with 20 deposit
    const channelId = harness.openStateChannel(payerSigner, merchant, 20.0);
    expect(harness.getBalance(payer)).toBe(80.0);

    const channel = harness.getChannel(channelId);
    expect(channel?.status).toBe('open');
    expect(channel?.deposited).toBe(20.0);
    expect(channel?.claimed).toBe(0);

    // Sign voucher for 5.0 with nonce 1
    const v1 = harness.signChannelVoucher(payerSigner, channelId, 5.0, 1);
    expect(v1.voucherSignature).toBeDefined();

    // Merchant claims voucher
    const claim1 = harness.claimChannelVoucher(merchant, v1);
    expect(claim1.claimed).toBe(5.0);
    expect(claim1.remainingEscrow).toBe(15.0);
    expect(harness.getBalance(merchant)).toBe(105.0);

    // Sign second cumulative voucher for 12.0 with nonce 2
    const v2 = harness.signChannelVoucher(payerSigner, channelId, 12.0, 2);
    const claim2 = harness.claimChannelVoucher(merchant, v2);
    expect(claim2.claimed).toBe(12.0);
    expect(claim2.remainingEscrow).toBe(8.0);
    expect(harness.getBalance(merchant)).toBe(112.0);
  });

  it('throws Error Code 1170 (ERR_CONTRACT_INVALID_NONCE) on stale/replayed nonces', () => {
    const merchant = merchantSigner.getPublicKey();
    const channelId = harness.openStateChannel(payerSigner, merchant, 30.0);

    const v1 = harness.signChannelVoucher(payerSigner, channelId, 10.0, 5);
    harness.claimChannelVoucher(merchant, v1);

    // Attempting to sign voucher with nonce 5 or lower must throw
    expect(() => harness.signChannelVoucher(payerSigner, channelId, 15.0, 5)).toThrowError();
    expect(() => harness.signChannelVoucher(payerSigner, channelId, 15.0, 4)).toThrowError();
  });

  it('throws Error Code 1171 (ERR_CONTRACT_AMOUNT_EXCEEDED) when voucher exceeds deposited escrow', () => {
    const merchant = merchantSigner.getPublicKey();
    const channelId = harness.openStateChannel(payerSigner, merchant, 10.0);

    expect(() => harness.signChannelVoucher(payerSigner, channelId, 15.0, 1)).toThrow();
  });

  it('closes state channel and refunds remaining escrow to payer', () => {
    const payer = payerSigner.getPublicKey();
    const merchant = merchantSigner.getPublicKey();

    const channelId = harness.openStateChannel(payerSigner, merchant, 50.0);
    expect(harness.getBalance(payer)).toBe(50.0);

    const v1 = harness.signChannelVoucher(payerSigner, channelId, 20.0, 1);
    harness.claimChannelVoucher(merchant, v1);
    expect(harness.getBalance(merchant)).toBe(120.0);

    // Close channel
    const settlement = harness.closeStateChannel(payer, channelId);
    expect(settlement.payerRefund).toBe(30.0);
    expect(settlement.merchantPayout).toBe(20.0);

    // Payer receives unspent 30 back: 50 + 30 = 80
    expect(harness.getBalance(payer)).toBe(80.0);

    // Subsequent voucher on closed channel throws
    expect(() => harness.signChannelVoucher(payerSigner, channelId, 25.0, 2)).toThrow();
  });

  it('injected network failure trips circuit breaker with Error Code 1005 (ERR_NETWORK_CIRCUIT_OPEN)', async () => {
    const lossyHarness = new MockPaymentHarness({
      failureRate: 1.0, // 100% failure injection
    });
    const merchant = merchantSigner.getPublicKey();
    const challenge = lossyHarness.create402Challenge(merchant, 1.0, 'XLM');

    await expect(lossyHarness.settlePayment(payerSigner, challenge)).rejects.toMatchObject({
      code: 1005,
      slug: 'ERR_NETWORK_CIRCUIT_OPEN',
    });
  });
});
