import { describe, it, expect } from 'vitest';
import { generateWallet } from '../src/commands/wallet.js';

describe('CLI Wallet Command', () => {
  it('generates a valid Stellar Ed25519 keypair', async () => {
    const wallet = await generateWallet();
    expect(wallet.publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    expect(wallet.secret).toMatch(/^S[A-Z2-7]{55}$/);
  });
});
