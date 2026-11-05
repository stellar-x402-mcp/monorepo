export interface AgentBudgetPolicy {
  maxDailySpend: number;
  maxSpendPerCall: number;
  priority?: 'critical' | 'standard' | 'low';
}

export interface TeamBudgetPolicy {
  maxDailySpend: number;
  maxSpendPerCall: number;
  defaultAgentPolicy?: AgentBudgetPolicy;
}

export interface SpendEvaluation {
  allowed: boolean;
  reason?: string;
  errorCode?: number;
  slug?: string;
  remainingAgentBudget: number;
  remainingTeamBudget: number;
}

export interface AgentSpendSummary {
  agentId: string;
  dailySpend: number;
  totalCalls: number;
  remainingDailyBudget: number;
  policy: AgentBudgetPolicy;
}

export interface TeamAllocationReport {
  teamDailySpend: number;
  teamRemainingDailyBudget: number;
  totalCalls: number;
  activeAgentsCount: number;
  policy: TeamBudgetPolicy;
  agents: Record<string, AgentSpendSummary>;
}

export class CollectiveBudgetTracker {
  private teamDailySpend: number = 0;
  private teamTotalCalls: number = 0;
  private teamLastResetTime: number = Date.now();
  private teamPolicy: TeamBudgetPolicy;

  private agentSpends: Map<string, number> = new Map();
  private agentCalls: Map<string, number> = new Map();
  private agentLastResets: Map<string, number> = new Map();
  private agentPolicies: Map<string, AgentBudgetPolicy> = new Map();

  constructor(teamPolicy: TeamBudgetPolicy) {
    this.teamPolicy = teamPolicy;
  }

  private getDefaultAgentPolicy(): AgentBudgetPolicy {
    return (
      this.teamPolicy.defaultAgentPolicy ?? {
        maxDailySpend: this.teamPolicy.maxDailySpend,
        maxSpendPerCall: this.teamPolicy.maxSpendPerCall,
        priority: 'standard',
      }
    );
  }

  registerAgent(agentId: string, policy?: Partial<AgentBudgetPolicy>): void {
    const defaults = this.getDefaultAgentPolicy();
    this.agentPolicies.set(agentId, {
      maxDailySpend: policy?.maxDailySpend ?? defaults.maxDailySpend,
      maxSpendPerCall: policy?.maxSpendPerCall ?? defaults.maxSpendPerCall,
      priority: policy?.priority ?? defaults.priority ?? 'standard',
    });
    if (!this.agentSpends.has(agentId)) {
      this.agentSpends.set(agentId, 0);
      this.agentCalls.set(agentId, 0);
      this.agentLastResets.set(agentId, Date.now());
    }
  }

  private checkAndResetTeamWindow(): void {
    if (Date.now() - this.teamLastResetTime > 24 * 60 * 60 * 1000) {
      this.teamDailySpend = 0;
      this.teamTotalCalls = 0;
      this.teamLastResetTime = Date.now();
    }
  }

  private checkAndResetAgentWindow(agentId: string): void {
    const lastReset = this.agentLastResets.get(agentId) ?? Date.now();
    if (Date.now() - lastReset > 24 * 60 * 60 * 1000) {
      this.agentSpends.set(agentId, 0);
      this.agentCalls.set(agentId, 0);
      this.agentLastResets.set(agentId, Date.now());
    }
  }

  getAgentPolicy(agentId: string): AgentBudgetPolicy {
    if (!this.agentPolicies.has(agentId)) {
      this.registerAgent(agentId);
    }
    return this.agentPolicies.get(agentId)!;
  }

  evaluateSpend(agentId: string, amount: number): SpendEvaluation {
    this.checkAndResetTeamWindow();
    this.checkAndResetAgentWindow(agentId);

    const agentPolicy = this.getAgentPolicy(agentId);
    const agentSpend = this.agentSpends.get(agentId) ?? 0;

    const remainingAgentBudget = Math.max(0, agentPolicy.maxDailySpend - agentSpend);
    const remainingTeamBudget = Math.max(0, this.teamPolicy.maxDailySpend - this.teamDailySpend);

    // 1. Team single-call cap
    if (amount > this.teamPolicy.maxSpendPerCall) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds team single-call spending cap of ${this.teamPolicy.maxSpendPerCall}`,
        errorCode: 1190,
        slug: 'ERR_CLIENT_BUDGET_CALL_EXCEEDED',
        remainingAgentBudget,
        remainingTeamBudget,
      };
    }

    // 2. Agent single-call cap
    if (amount > agentPolicy.maxSpendPerCall) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds agent ${agentId} single-call spending cap of ${agentPolicy.maxSpendPerCall}`,
        errorCode: 1190,
        slug: 'ERR_CLIENT_BUDGET_CALL_EXCEEDED',
        remainingAgentBudget,
        remainingTeamBudget,
      };
    }

    // 3. Agent daily budget cap
    if (agentSpend + amount > agentPolicy.maxDailySpend) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds agent ${agentId} remaining daily budget of ${remainingAgentBudget}`,
        errorCode: 1192,
        slug: 'ERR_CLIENT_BUDGET_DAILY_EXCEEDED',
        remainingAgentBudget,
        remainingTeamBudget,
      };
    }

    // 4. Team daily budget cap
    if (this.teamDailySpend + amount > this.teamPolicy.maxDailySpend) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds collective team remaining daily budget of ${remainingTeamBudget}`,
        errorCode: 1192,
        slug: 'ERR_CLIENT_BUDGET_DAILY_EXCEEDED',
        remainingAgentBudget,
        remainingTeamBudget,
      };
    }

    return {
      allowed: true,
      remainingAgentBudget: remainingAgentBudget - amount,
      remainingTeamBudget: remainingTeamBudget - amount,
    };
  }

  canSpend(agentId: string, amount: number): boolean {
    return this.evaluateSpend(agentId, amount).allowed;
  }

  recordSpend(agentId: string, amount: number): void {
    const evalResult = this.evaluateSpend(agentId, amount);
    if (!evalResult.allowed) {
      const err = new Error(evalResult.reason);
      (err as any).code = evalResult.errorCode;
      (err as any).slug = evalResult.slug;
      throw err;
    }

    const currentAgentSpend = this.agentSpends.get(agentId) ?? 0;
    const currentAgentCalls = this.agentCalls.get(agentId) ?? 0;

    this.agentSpends.set(agentId, currentAgentSpend + amount);
    this.agentCalls.set(agentId, currentAgentCalls + 1);

    this.teamDailySpend += amount;
    this.teamTotalCalls += 1;
  }

  getRemainingAgentBudget(agentId: string): number {
    this.checkAndResetAgentWindow(agentId);
    const policy = this.getAgentPolicy(agentId);
    const spent = this.agentSpends.get(agentId) ?? 0;
    return Math.max(0, policy.maxDailySpend - spent);
  }

  getRemainingTeamBudget(): number {
    this.checkAndResetTeamWindow();
    return Math.max(0, this.teamPolicy.maxDailySpend - this.teamDailySpend);
  }

  getAgentSummary(agentId: string): AgentSpendSummary {
    this.checkAndResetAgentWindow(agentId);
    const policy = this.getAgentPolicy(agentId);
    const dailySpend = this.agentSpends.get(agentId) ?? 0;
    const totalCalls = this.agentCalls.get(agentId) ?? 0;
    return {
      agentId,
      dailySpend,
      totalCalls,
      remainingDailyBudget: Math.max(0, policy.maxDailySpend - dailySpend),
      policy,
    };
  }

  getTeamReport(): TeamAllocationReport {
    this.checkAndResetTeamWindow();
    const agentsSummary: Record<string, AgentSpendSummary> = {};
    for (const agentId of this.agentPolicies.keys()) {
      agentsSummary[agentId] = this.getAgentSummary(agentId);
    }
    return {
      teamDailySpend: this.teamDailySpend,
      teamRemainingDailyBudget: Math.max(0, this.teamPolicy.maxDailySpend - this.teamDailySpend),
      totalCalls: this.teamTotalCalls,
      activeAgentsCount: this.agentPolicies.size,
      policy: this.teamPolicy,
      agents: agentsSummary,
    };
  }

  resetAgent(agentId: string): void {
    this.agentSpends.set(agentId, 0);
    this.agentCalls.set(agentId, 0);
    this.agentLastResets.set(agentId, Date.now());
  }

  resetTeam(): void {
    this.teamDailySpend = 0;
    this.teamTotalCalls = 0;
    this.teamLastResetTime = Date.now();
    for (const agentId of this.agentPolicies.keys()) {
      this.resetAgent(agentId);
    }
  }
}
