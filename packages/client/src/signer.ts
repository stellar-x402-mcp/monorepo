import { Keypair, Transaction, FeeBumpTransaction } from '@stellar/stellar-sdk';
import crypto from 'crypto';

export interface WalletSigner {
  getPublicKey(): string;
  sign(data: Buffer | Uint8Array): Buffer;
  signTransaction(tx: Transaction | FeeBumpTransaction): void;
  signChallenge(challenge: Record<string, any>): Promise<string>;
}

export interface AsyncWalletSigner extends WalletSigner {
  signAsync(data: Buffer | Uint8Array): Promise<Buffer>;
  signTransactionAsync(tx: Transaction | FeeBumpTransaction): Promise<void>;
}

export type CustomSigningDelegate = (payload: Buffer) => Promise<Buffer>;

/**
 * In-memory Stellar Ed25519 Wallet Signer.
 * Private key bytes are held strictly in memory and redacted from serialization.
 */
export class InMemoryWalletSigner implements AsyncWalletSigner {
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

  public async signAsync(data: Buffer | Uint8Array): Promise<Buffer> {
    return this.sign(data);
  }

  public signTransaction(tx: Transaction | FeeBumpTransaction): void {
    tx.sign(this.keypair);
  }

  public async signTransactionAsync(tx: Transaction | FeeBumpTransaction): Promise<void> {
    this.signTransaction(tx);
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

/**
 * Enterprise Custom / Cloud KMS Agent Signer.
 * Delegates asymmetric Ed25519 signing to an external hardware module (HSM),
 * AWS KMS, Google Cloud KMS, or HashiCorp Vault.
 * Ensures private keys are never loaded into plain application memory.
 */
export class CustomAgentSigner implements AsyncWalletSigner {
  private readonly publicKey: string;
  private readonly signingDelegate: CustomSigningDelegate;

  constructor(publicKey: string, signingDelegate: CustomSigningDelegate) {
    this.publicKey = publicKey;
    this.signingDelegate = signingDelegate;
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public sign(data: Buffer | Uint8Array): Buffer {
    throw new Error(
      'CustomAgentSigner operates asynchronously; use signAsync or signChallenge instead.'
    );
  }

  public async signAsync(data: Buffer | Uint8Array): Promise<Buffer> {
    return await this.signingDelegate(Buffer.from(data));
  }

  public signTransaction(tx: Transaction | FeeBumpTransaction): void {
    throw new Error(
      'Synchronous signTransaction is not supported by CustomAgentSigner; use signTransactionAsync instead.'
    );
  }

  public async signTransactionAsync(tx: Transaction | FeeBumpTransaction): Promise<void> {
    const signatureBuffer = await this.signingDelegate(tx.signatureBase());
    tx.addSignature(this.publicKey, signatureBuffer.toString('base64'));
  }

  public async signChallenge(challenge: Record<string, any>): Promise<string> {
    const challengeHash =
      challenge.challengeHash ||
      challenge.hash ||
      (challenge.txHash as string) ||
      crypto
        .createHash('sha256')
        .update(JSON.stringify(challenge))
        .digest('hex');

    const signatureBytes = await this.signingDelegate(Buffer.from(challengeHash, 'utf8'));
    return signatureBytes.toString('hex');
  }

  public toJSON(): Record<string, string> {
    return {
      publicKey: this.getPublicKey(),
      type: 'custom_kms',
      secretKey: '[DELEGATED_KMS_SECURE]',
    };
  }
}
