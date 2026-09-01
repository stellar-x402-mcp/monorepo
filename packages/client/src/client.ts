import { BudgetPolicy, BudgetTracker } from './budget.js';

export interface X402AgentClientConfig {
  payerAddress: string;
  budgetPolicy?: BudgetPolicy;
  signAuthorization: (challenge: any) => Promise<string>;
}

export class X402AgentMcpClient {
  private config: X402AgentClientConfig;
  private budgetTracker?: BudgetTracker;

  constructor(config: X402AgentClientConfig) {
    this.config = config;
    if (config.budgetPolicy) {
      this.budgetTracker = new BudgetTracker(config.budgetPolicy);
    }
  }

  /**
   * Invokes an MCP tool, resolving 402 challenges automatically within policy limits
   */
  async invokeTool<T = any>(
    toolFn: (args: any, context?: any) => Promise<T>,
    args: any
  ): Promise<T> {
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

        // Sign challenge authorization
        const signature = await this.config.signAuthorization(err.challenge);

        if (this.budgetTracker) {
          this.budgetTracker.recordSpend(price);
        }

        // Retry tool execution with payment signature
        return await toolFn(args, { paymentSignature: signature });
      }

      throw err;
    }
  }
}
