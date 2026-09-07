import { describe, it, expect, vi } from 'vitest';
import {
  Account,
  Asset,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { OnChainTransactionVerifier } from '../src/verifier.js';

describe('OnChainTransactionVerifier', () => {
  const verifier = new OnChainTransactionVerifier({
    network: 'stellar:testnet',
    horizonUrl: 'https://horizon.mock',
    sorobanRpcUrl: 'https://soroban.mock',
  });

  const merchantKeypair = Keypair.random();
  const payerKeypair = Keypair.random();

  describe('verifyTransactionHash', () => {
    it('should successfully verify a valid on-chain payment from Horizon', async () => {
      const txHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const mockTx = {
        id: txHash,
        successful: true,
        ledger: 109283,
        created_at: new Date().toISOString(),
        memo: 'challenge-nonce-123',
      };

      const mockOps = {
        _embedded: {
          records: [
            {
              type: 'payment',
              from: payerKeypair.publicKey(),
              to: merchantKeypair.publicKey(),
              asset_type: 'native',
              amount: '1.0000000',
            },
          ],
        },
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/operations')) {
          return { ok: true, json: async () => mockOps };
        }
        return { ok: true, json: async () => mockTx };
      });

      const result = await verifier.verifyTransactionHash(txHash, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '0.5',
        expectedAsset: 'native',
        expectedMemo: 'challenge-nonce-123',
      });

      expect(result.verified).toBe(true);
      expect(result.recipient).toBe(merchantKeypair.publicKey());
      expect(result.amount).toBe('1.0000000');
      expect(result.ledger).toBe(109283);
    });

    it('should reject payment when amount is insufficient', async () => {
      const txHash = 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const mockTx = {
        id: txHash,
        successful: true,
        ledger: 109284,
        created_at: new Date().toISOString(),
      };

      const mockOps = {
        _embedded: {
          records: [
            {
              type: 'payment',
              from: payerKeypair.publicKey(),
              to: merchantKeypair.publicKey(),
              asset_type: 'native',
              amount: '0.0010000',
            },
          ],
        },
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/operations')) {
          return { ok: true, json: async () => mockOps };
        }
        return { ok: true, json: async () => mockTx };
      });

      const result = await verifier.verifyTransactionHash(txHash, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '0.005',
        expectedAsset: 'native',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('No matching payment operation found');
    });

    it('should reject when memo does not match expected challenge nonce', async () => {
      const txHash = 'memo_mismatch_hash';
      const mockTx = {
        id: txHash,
        successful: true,
        created_at: new Date().toISOString(),
        memo: 'wrong-nonce',
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await verifier.verifyTransactionHash(txHash, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '1.0',
        expectedMemo: 'expected-nonce-999',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Memo mismatch');
    });

    it('should reject when transaction failed on-chain', async () => {
      const txHash = 'failed_tx_hash';
      const mockTx = {
        id: txHash,
        successful: false,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTx,
      });

      const result = await verifier.verifyTransactionHash(txHash, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '1.0',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toBe('Transaction failed on-chain');
    });

    it('should fall back to Soroban RPC when Horizon returns 404', async () => {
      const txHash = 'soroban_tx_hash';

      global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
        if (url.includes('horizon.mock')) {
          return { ok: false, status: 404, statusText: 'Not Found' };
        }
        // Soroban RPC
        return {
          ok: true,
          json: async () => ({
            result: {
              status: 'SUCCESS',
              latestLedger: 554433,
              createdAt: '2026-09-01T12:00:00Z',
            },
          }),
        };
      });

      const result = await verifier.verifyTransactionHash(txHash, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '1.0',
      });

      expect(result.verified).toBe(true);
      expect(result.ledger).toBe(554433);
    });
  });

  describe('verifyEnvelopeXdr', () => {
    it('should successfully verify a signed transaction envelope XDR', async () => {
      const payerAccount = new Account(payerKeypair.publicKey(), '100');
      const tx = new TransactionBuilder(payerAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: merchantKeypair.publicKey(),
            asset: Asset.native(),
            amount: '2.5000000',
          })
        )
        .addMemo(Memo.text('nonce-xyz'))
        .setTimeout(300)
        .build();

      tx.sign(payerKeypair);
      const envelopeXdr = tx.toEnvelope().toXDR('base64');

      const result = await verifier.verifyEnvelopeXdr(envelopeXdr, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '2.5',
        expectedAsset: 'native',
        expectedMemo: 'nonce-xyz',
      });

      expect(result.verified).toBe(true);
      expect(result.recipient).toBe(merchantKeypair.publicKey());
      expect(result.amount).toBe('2.5000000');
      expect(result.payer).toBe(payerKeypair.publicKey());
    });

    it('should reject envelope without signatures', async () => {
      const payerAccount = new Account(payerKeypair.publicKey(), '100');
      const tx = new TransactionBuilder(payerAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: merchantKeypair.publicKey(),
            asset: Asset.native(),
            amount: '1.0000000',
          })
        )
        .setTimeout(300)
        .build();

      // Don't sign
      const envelopeXdr = tx.toEnvelope().toXDR('base64');

      const result = await verifier.verifyEnvelopeXdr(envelopeXdr, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '1.0',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Transaction envelope has no signatures');
    });

    it('should reject envelope with expired timebounds', async () => {
      const payerAccount = new Account(payerKeypair.publicKey(), '100');
      const pastTime = Math.floor(Date.now() / 1000) - 100;
      const tx = new TransactionBuilder(payerAccount, {
        fee: '100',
        networkPassphrase: Networks.TESTNET,
        timebounds: {
          minTime: '1',
          maxTime: pastTime.toString(),
        },
      })
        .addOperation(
          Operation.payment({
            destination: merchantKeypair.publicKey(),
            asset: Asset.native(),
            amount: '1.0000000',
          })
        )
        .build();

      tx.sign(payerKeypair);
      const envelopeXdr = tx.toEnvelope().toXDR('base64');

      const result = await verifier.verifyEnvelopeXdr(envelopeXdr, {
        expectedRecipient: merchantKeypair.publicKey(),
        expectedPrice: '1.0',
      });

      expect(result.verified).toBe(false);
      expect(result.error).toContain('Transaction has expired');
    });
  });
});
