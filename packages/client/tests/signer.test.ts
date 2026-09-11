import { describe, it, expect, vi } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { InMemoryWalletSigner, CustomAgentSigner } from '../src/signer.js';

describe('InMemoryWalletSigner', () => {
  it('should generate random keypair and sign data', async () => {
    const signer = InMemoryWalletSigner.random();
    expect(signer.getPublicKey()).toMatch(/^G[A-Z0-9]{55}$/);

    const payload = Buffer.from('test-payload');
    const signature = signer.sign(payload);
    expect(signature).toBeInstanceOf(Buffer);
    expect(signature.length).toBe(64);

    const asyncSig = await signer.signAsync(payload);
    expect(asyncSig.equals(signature)).toBe(true);
  });

  it('should sign 402 challenges deterministically', async () => {
    const keypair = Keypair.random();
    const signer = new InMemoryWalletSigner(keypair);

    const challenge = {
      nonce: 'test-nonce-123',
      amount: '0.05',
      destination: 'GABC...',
    };

    const sigHex = await signer.signChallenge(challenge);
    expect(typeof sigHex).toBe('string');
    expect(sigHex.length).toBe(128); // 64 bytes in hex
  });

  it('should redact secretKey from serialization', () => {
    const signer = InMemoryWalletSigner.random();
    const serialized = signer.toJSON();

    expect(serialized.publicKey).toBe(signer.getPublicKey());
    expect(serialized.secretKey).toBe('[REDACTED]');
    expect(serialized.type).toBe('ed25519');
  });
});

describe('CustomAgentSigner (Enterprise KMS / HSM Delegation)', () => {
  it('should delegate signing to an asynchronous external KMS hook', async () => {
    const mockKeypair = Keypair.random();
    const externalSigningDelegate = vi.fn().mockImplementation(async (payload: Buffer) => {
      return mockKeypair.sign(payload);
    });

    const signer = new CustomAgentSigner(mockKeypair.publicKey(), externalSigningDelegate);
    expect(signer.getPublicKey()).toBe(mockKeypair.publicKey());

    const testData = Buffer.from('remote-kms-data');
    const sig = await signer.signAsync(testData);

    expect(externalSigningDelegate).toHaveBeenCalledWith(testData);
    expect(sig.length).toBe(64);
  });

  it('should sign challenges via delegated KMS hook', async () => {
    const mockKeypair = Keypair.random();
    const externalSigningDelegate = vi.fn().mockImplementation(async (payload: Buffer) => {
      return mockKeypair.sign(payload);
    });

    const signer = new CustomAgentSigner(mockKeypair.publicKey(), externalSigningDelegate);
    const challenge = {
      challengeHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };

    const sigHex = await signer.signChallenge(challenge);
    expect(externalSigningDelegate).toHaveBeenCalled();
    expect(sigHex.length).toBe(128);
  });

  it('should reject synchronous sign calls with clear guidance to use signAsync', () => {
    const signer = new CustomAgentSigner('G...', async (buf) => buf);
    expect(() => signer.sign(Buffer.from('data'))).toThrow(
      'CustomAgentSigner operates asynchronously'
    );
  });

  it('should serialize with redacted delegated KMS status', () => {
    const signer = new CustomAgentSigner('GABCDEF...', async (buf) => buf);
    const json = signer.toJSON();

    expect(json.publicKey).toBe('GABCDEF...');
    expect(json.type).toBe('custom_kms');
    expect(json.secretKey).toBe('[DELEGATED_KMS_SECURE]');
  });
});
