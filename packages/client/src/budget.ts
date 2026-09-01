export interface BudgetPolicy {
  maxSpendPerCall: number;
  maxDailySpend: number;
}

export class BudgetTracker {
  private dailySpend: number = 0;
  private lastResetTime: number = Date.now();
  private policy: BudgetPolicy;

  constructor(policy: BudgetPolicy) {
    this.policy = policy;
  }

  canSpend(amount: number): boolean {
    // Reset daily tracker after 24 hours
    if (Date.now() - this.lastResetTime > 24 * 60 * 60 * 1000) {
      this.dailySpend = 0;
      this.lastResetTime = Date.now();
    }

    if (amount > this.policy.maxSpendPerCall) {
      return false;
    }

    if (this.dailySpend + amount > this.policy.maxDailySpend) {
      return false;
    }

    return true;
  }

  recordSpend(amount: number): void {
    this.dailySpend += amount;
  }

  getRemainingDailyBudget(): number {
    return Math.max(0, this.policy.maxDailySpend - this.dailySpend);
  }
}
