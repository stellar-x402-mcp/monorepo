import { describe, expect, it } from 'vitest';
import {
  Account,
  Asset,
  Claimant,
  Keypair,
  Memo,
  Networks,
} from '@stellar/stellar-sdk';
import { InMemoryWalletSigner } from '../src/signer.js';
import { MultiPaymentSettlementEngine } from '../src/settlement.js';
import { X402AgentMcpClient } from '../src/client.js';

describe('InMemoryWalletSigner & MultiPaymentSettlementEngine', () => {
  const payerKeypair = Keypair.random();
  const merchantKeypair = Keypair.random();
  const signer = new InMemoryWalletSigner(payerKeypair);

  it('InMemoryWalletSigner generates valid public keys and signs challenges', async () => {
    expect(signer.getPublicKey()).toBe(payerKeypair.publicKey());
    expect(signer.getPublicKey().startsWith('G')).toBe(true);

    const sig = await signer.signChallenge({
      challengeHash: 'abc123def456',
      price: '0.01',
    });

    expect(typeof sig).toBe('string');
    expect(sig.length).toBe(128); // 64-byte ed25519 signature in hex
  });

  it('InMemoryWalletSigner redacts private key in toJSON serialization', () => {
    const json = signer.toJSON();
    expect(json.publicKey).toBe(payerKeypair.publicKey());
    expect(json.secretKey).toBe('[REDACTED]');
  });

  it('MultiPaymentSettlementEngine builds signed native XLM payment', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const mockAccount = new Account(payerKeypair.publicKey(), '100');

    const tx = await engine.buildNativePayment(
      mockAccount,
      merchantKeypair.publicKey(),
      '5.0000000',
      Memo.text('x402-payment')
    );

    expect(tx.operations.length).toBe(1);
    expect(tx.operations[0]?.type).toBe('payment');
    expect(tx.signatures.length).toBeGreaterThan(0);
  });

  it('MultiPaymentSettlementEngine builds signed strict-receive path payment', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const mockAccount = new Account(payerKeypair.publicKey(), '101');
    const usdc = new Asset('USDC', merchantKeypair.publicKey());

    const tx = await engine.buildPathPayment(
      mockAccount,
      merchantKeypair.publicKey(),
      Asset.native(),
      '10.0000000',
      usdc,
      '1.000000'
    );

    expect(tx.operations.length).toBe(1);
    expect(tx.operations[0]?.type).toBe('pathPaymentStrictReceive');
    expect(tx.signatures.length).toBeGreaterThan(0);
  });

  it('MultiPaymentSettlementEngine builds signed claimable balance escrow', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const mockAccount = new Account(payerKeypair.publicKey(), '102');
    const claimants = [
      new Claimant(merchantKeypair.publicKey(), Claimant.predicateUnconditional()),
    ];

    const tx = await engine.buildClaimableBalance(
      mockAccount,
      Asset.native(),
      '2.5000000',
      claimants
    );

    expect(tx.operations.length).toBe(1);
    expect(tx.operations[0]?.type).toBe('createClaimableBalance');
    expect(tx.signatures.length).toBeGreaterThan(0);
  });

  it('MultiPaymentSettlementEngine builds sponsored fee-bump envelope', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const mockAccount = new Account(payerKeypair.publicKey(), '103');
    const sponsorKeypair = Keypair.random();

    const innerTx = await engine.buildNativePayment(
      mockAccount,
      merchantKeypair.publicKey(),
      '1.0000000'
    );

    const feeBump = await engine.buildFeeBump(innerTx, sponsorKeypair, '600');
    expect(feeBump.feeSource).toBe(sponsorKeypair.publicKey());
    expect(Number(feeBump.fee)).toBeGreaterThanOrEqual(200);
    expect(feeBump.signatures.length).toBeGreaterThan(0);
  });

  it('MultiPaymentSettlementEngine generates signed state channel vouchers', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const voucher = await engine.buildStateChannelVoucher(
      'chan-101',
      5,
      '0.0050000',
      merchantKeypair.publicKey()
    );

    expect(voucher.voucherHash).toBeDefined();
    expect(voucher.voucherProof).toContain('chan-101.5.');
  });

  it('MultiPaymentSettlementEngine dispatches settleChallenge for state_channel', async () => {
    const engine = new MultiPaymentSettlementEngine(signer, Networks.TESTNET);
    const res = await engine.settleChallenge(
      {
        price: '0.005',
        asset: 'USDC',
        recipient: merchantKeypair.publicKey(),
      },
      { method: 'state_channel', channelId: 'chan-001', channelSequence: 2 }
    );

    expect(res.method).toBe('state_channel');
    expect(res.voucherProof).toBeDefined();
    expect(res.amount).toBe('0.005');
  });

  it('X402AgentMcpClient auto-resolves paywall challenges using InMemoryWalletSigner', async () => {
    const client = new X402AgentMcpClient({
      signer,
      budgetPolicy: { maxSpendPerCall: 1.0, maxDailySpend: 10.0 },
    });

    let invocationCount = 0;
    const paywalledTool = async (args: { query: string }, context?: { paymentSignature?: string }) => {
      invocationCount++;
      if (!context?.paymentSignature) {
        const err: any = new Error('Payment required');
        err.name = 'PaymentRequiredError';
        err.challenge = {
          price: '0.05',
          asset: 'native',
          recipient: merchantKeypair.publicKey(),
        };
        throw err;
      }

      return { result: `Executed ${args.query} with proof ${context.paymentSignature.slice(0, 10)}` };
    };

    const output = await client.invokeTool(paywalledTool, { query: 'test-dataset' });
    expect(invocationCount).toBe(2); // First call triggered 402, second call resolved it
    expect(output.result).toContain('Executed test-dataset with proof');
  });
});
