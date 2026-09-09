import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { Networks } from '@stellar/stellar-sdk';
import { BudgetPolicy, BudgetTracker } from './budget.js';
import { CircuitBreaker, CircuitBreakerOptions, IdempotencyTracker } from './resilience.js';
import { MultiPaymentSettlementEngine } from './settlement.js';
import { InMemoryWalletSigner, WalletSigner } from './signer.js';

export interface X402AgentClientConfig {
  payerAddress?: string | undefined;
  budgetPolicy?: BudgetPolicy | undefined;
  signAuthorization?: ((challenge: any) => Promise<string>) | undefined;
  signer?: WalletSigner | undefined;
  secretKey?: string | undefined;
  networkPassphrase?: string | undefined;
  circuitBreakerOptions?: CircuitBreakerOptions | undefined;
}

export class X402AgentMcpClient {
  private config: X402AgentClientConfig;
  private budgetTracker?: BudgetTracker | undefined;
  private signer?: WalletSigner | undefined;
  private settlementEngine?: MultiPaymentSettlementEngine | undefined;
  private circuitBreaker: CircuitBreaker;
  private idempotencyTracker = new IdempotencyTracker();

  constructor(config: X402AgentClientConfig) {
    this.config = config;
    if (config.budgetPolicy) {
      this.budgetTracker = new BudgetTracker(config.budgetPolicy);
    }

    if (config.signer) {
      this.signer = config.signer;
    } else if (config.secretKey) {
      this.signer = InMemoryWalletSigner.fromSecret(config.secretKey);
    }

    if (this.signer) {
      this.settlementEngine = new MultiPaymentSettlementEngine(
        this.signer,
        config.networkPassphrase || Networks.TESTNET
      );
    }

    this.circuitBreaker = new CircuitBreaker(config.circuitBreakerOptions);
  }

  public getSigner(): WalletSigner | undefined {
    return this.signer;
  }

  public getCircuitBreaker(): CircuitBreaker {
    return this.circuitBreaker;
  }

  public getIdempotencyTracker(): IdempotencyTracker {
    return this.idempotencyTracker;
  }

  public getPayerAddress(): string {
    if (this.config.payerAddress) {
      return this.config.payerAddress;
    }
    if (this.signer) {
      return this.signer.getPublicKey();
    }
    return '';
  }

  /**
   * Invokes an MCP tool, resolving 402 challenges automatically within policy limits.
   */
  async invokeTool<T = any>(
    toolFn: (args: any, context?: any) => Promise<T>,
    args: any
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      try {
        return await toolFn(args);
      } catch (err: any) {
        if (err.name === 'PaymentRequiredError' && err.challenge) {
          const price = parseFloat(err.challenge.price);

          if (this.budgetTracker && !this.budgetTracker.canSpend(price)) {
            throw new Error(
              `Budget exceeded: Cannot spend ${price} tokens (daily remaining: ${this.budgetTracker.getRemainingDailyBudget()})`
            );
          }

          let signature: string;
          if (this.config.signAuthorization) {
            signature = await this.config.signAuthorization(err.challenge);
          } else if (this.settlementEngine) {
            const settlement = await this.settlementEngine.settleChallenge(err.challenge);
            signature = settlement.txHash;
          } else {
            throw new Error('No signing authorization function or wallet signer configured');
          }

          this.idempotencyTracker.register(signature);

          if (this.budgetTracker) {
            this.budgetTracker.recordSpend(price);
          }

          // Retry tool execution with payment signature
          return await toolFn(args, { paymentSignature: signature });
        }

        throw err;
      }
    });
  }

  /**
   * Invokes a tool via an MCP Client instance, automatically intercepting 402 challenge responses.
   */
  async callTool(
    mcpClient: Client,
    name: string,
    args: Record<string, any> = {}
  ): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const initialResult: any = await mcpClient.callTool({
        name,
        arguments: args,
      });

      if (initialResult?.isError && initialResult.content?.[0]?.text) {
        try {
          const parsed = JSON.parse(initialResult.content[0].text);
          if (parsed.error === 'PAYMENT_REQUIRED' && parsed.challenge) {
            const price = parseFloat(parsed.challenge.price);

            if (this.budgetTracker && !this.budgetTracker.canSpend(price)) {
              throw new Error(
                `Budget exceeded: Cannot spend ${price} tokens (daily remaining: ${this.budgetTracker.getRemainingDailyBudget()})`
              );
            }

            let signature: string;
            if (this.config.signAuthorization) {
              signature = await this.config.signAuthorization(parsed.challenge);
            } else if (this.settlementEngine) {
              const settlement = await this.settlementEngine.settleChallenge(parsed.challenge);
              signature = settlement.txHash;
            } else {
              throw new Error('No signing authorization function or wallet signer configured');
            }

            this.idempotencyTracker.register(signature);

            if (this.budgetTracker) {
              this.budgetTracker.recordSpend(price);
            }

            return await mcpClient.callTool({
              name,
              arguments: { ...args, paymentSignature: signature },
            });
          }
        } catch (parseErr: any) {
          if (parseErr.message?.startsWith('Budget exceeded')) {
            throw parseErr;
          }
        }
      }

      return initialResult;
    });
  }
}
