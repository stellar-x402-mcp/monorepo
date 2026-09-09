import { Keypair, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';
import crypto from 'crypto';

export interface WalletSigner {
  getPublicKey(): string;
  sign(data: Buffer | Uint8Array): Buffer;
  signTransaction(tx: Transaction | FeeBumpTransaction): void;
  signChallenge(challenge: Record<string, any>): Promise<string>;
}

/**
 * In-memory Stellar Ed25519 Wallet Signer.
 * Private key bytes are held strictly in memory and redacted from serialization.
 */
export class InMemoryWalletSigner implements WalletSigner {
  private readonly keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  public static fromSecret(secretKey: string): InMemoryWalletSigner {
    const keypair = Keypair.fromSecret(secretKey.trim());
    return new InMemoryWalletSigner(keypair);
  }

  public static random(): InMemoryWalletSigner {
    const keypair = Keypair.random();
    return new InMemoryWalletSigner(keypair);
  }

  public getPublicKey(): string {
    return this.keypair.publicKey();
  }

  public sign(data: Buffer | Uint8Array): Buffer {
    return this.keypair.sign(Buffer.from(data));
  }

  public signTransaction(tx: Transaction | FeeBumpTransaction): void {
    tx.sign(this.keypair);
  }

  /**
   * Signs a payment challenge using ed25519 signature of challenge hash.
   */
  public async signChallenge(challenge: Record<string, any>): Promise<string> {
    const challengeHash =
      challenge.challengeHash ||
      challenge.hash ||
      (challenge.txHash as string) ||
      crypto
        .createHash('sha256')
        .update(JSON.stringify(challenge))
        .digest('hex');

    const signatureBytes = this.keypair.sign(Buffer.from(challengeHash, 'utf8'));
    return signatureBytes.toString('hex');
  }

  /**
   * Security guard: Redact private key on JSON serialization or logging.
   */
  public toJSON(): Record<string, string> {
    return {
      publicKey: this.getPublicKey(),
      type: 'ed25519',
      secretKey: '[REDACTED]',
    };
  }
}
