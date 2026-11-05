import { describe, it, expect, beforeEach } from 'vitest';
import { CollectiveBudgetTracker } from '../src/collective_budget.js';

describe('CollectiveBudgetTracker - Multi-Agent Treasury Guardrails', () => {
  let tracker: CollectiveBudgetTracker;

  beforeEach(() => {
    tracker = new CollectiveBudgetTracker({
      maxDailySpend: 10.0,
      maxSpendPerCall: 1.0,
      defaultAgentPolicy: {
        maxDailySpend: 3.0,
        maxSpendPerCall: 0.5,
        priority: 'standard',
      },
    });
  });

  it('initializes team and agent budgets with default policies', () => {
    tracker.registerAgent('agent-researcher');
    const summary = tracker.getAgentSummary('agent-researcher');

    expect(summary.agentId).toBe('agent-researcher');
    expect(summary.dailySpend).toBe(0);
    expect(summary.totalCalls).toBe(0);
    expect(summary.remainingDailyBudget).toBe(3.0);
    expect(summary.policy.maxSpendPerCall).toBe(0.5);
    expect(tracker.getRemainingTeamBudget()).toBe(10.0);
  });

  it('enforces single-call spending cap per agent (Error Code 1190)', () => {
    tracker.registerAgent('agent-indexer', { maxSpendPerCall: 0.25 });

    // Allowed spend within cap
    const allowed = tracker.evaluateSpend('agent-indexer', 0.20);
    expect(allowed.allowed).toBe(true);

    // Rejected spend exceeding agent cap
    const rejected = tracker.evaluateSpend('agent-indexer', 0.30);
    expect(rejected.allowed).toBe(false);
    expect(rejected.errorCode).toBe(1190);
    expect(rejected.slug).toBe('ERR_CLIENT_BUDGET_CALL_EXCEEDED');
    expect(rejected.reason).toContain('exceeds agent agent-indexer single-call spending cap');
  });

  it('enforces global team single-call spending cap (Error Code 1190)', () => {
    tracker.registerAgent('agent-whale', { maxSpendPerCall: 5.0 }); // higher than team 1.0

    const rejected = tracker.evaluateSpend('agent-whale', 1.5);
    expect(rejected.allowed).toBe(false);
    expect(rejected.errorCode).toBe(1190);
    expect(rejected.slug).toBe('ERR_CLIENT_BUDGET_CALL_EXCEEDED');
    expect(rejected.reason).toContain('exceeds team single-call spending cap');
  });

  it('enforces per-agent daily budget limit (Error Code 1192)', () => {
    tracker.registerAgent('agent-worker', { maxDailySpend: 1.0, maxSpendPerCall: 0.5 });

    tracker.recordSpend('agent-worker', 0.5);
    tracker.recordSpend('agent-worker', 0.4);

    expect(tracker.getRemainingAgentBudget('agent-worker')).toBeCloseTo(0.1, 5);

    // Attempt to spend 0.2 when only 0.1 remaining
    const rejected = tracker.evaluateSpend('agent-worker', 0.2);
    expect(rejected.allowed).toBe(false);
    expect(rejected.errorCode).toBe(1192);
    expect(rejected.slug).toBe('ERR_CLIENT_BUDGET_DAILY_EXCEEDED');
    expect(rejected.reason).toContain('exceeds agent agent-worker remaining daily budget');
  });

  it('enforces collective team daily cap across multiple agents (Error Code 1192)', () => {
    const tightTracker = new CollectiveBudgetTracker({
      maxDailySpend: 1.0,
      maxSpendPerCall: 0.5,
    });

    tightTracker.registerAgent('agent-a', { maxDailySpend: 0.8, maxSpendPerCall: 0.5 });
    tightTracker.registerAgent('agent-b', { maxDailySpend: 0.8, maxSpendPerCall: 0.5 });

    tightTracker.recordSpend('agent-a', 0.5);
    tightTracker.recordSpend('agent-b', 0.4);

    expect(tightTracker.getRemainingTeamBudget()).toBeCloseTo(0.1, 5);

    // Agent A still has individual quota, but collective pool is exhausted
    expect(tightTracker.getRemainingAgentBudget('agent-a')).toBeCloseTo(0.3, 5);

    const rejected = tightTracker.evaluateSpend('agent-a', 0.2);
    expect(rejected.allowed).toBe(false);
    expect(rejected.errorCode).toBe(1192);
    expect(rejected.slug).toBe('ERR_CLIENT_BUDGET_DAILY_EXCEEDED');
    expect(rejected.reason).toContain('exceeds collective team remaining daily budget');
  });

  it('recordSpend throws typed error on unauthorized spend', () => {
    tracker.registerAgent('agent-strict', { maxSpendPerCall: 0.1 });

    expect(() => {
      tracker.recordSpend('agent-strict', 0.5);
    }).toThrowError(/exceeds agent agent-strict single-call spending cap/);
  });

  it('generates structured audit report for team allocations', () => {
    tracker.registerAgent('agent-alpha', { maxDailySpend: 2.0 });
    tracker.registerAgent('agent-beta', { maxDailySpend: 4.0 });

    tracker.recordSpend('agent-alpha', 0.5);
    tracker.recordSpend('agent-alpha', 0.3);
    tracker.recordSpend('agent-beta', 0.4);

    const report = tracker.getTeamReport();

    expect(report.activeAgentsCount).toBe(2);
    expect(report.totalCalls).toBe(3);
    expect(report.teamDailySpend).toBeCloseTo(1.2, 5);
    expect(report.teamRemainingDailyBudget).toBeCloseTo(8.8, 5);
    expect(report.agents['agent-alpha'].totalCalls).toBe(2);
    expect(report.agents['agent-alpha'].dailySpend).toBeCloseTo(0.8, 5);
    expect(report.agents['agent-beta'].totalCalls).toBe(1);
    expect(report.agents['agent-beta'].dailySpend).toBeCloseTo(0.4, 5);
  });

  it('resets individual agent and collective team quotas', () => {
    tracker.registerAgent('agent-reset-test', { maxDailySpend: 2.0, maxSpendPerCall: 1.0 });
    tracker.recordSpend('agent-reset-test', 1.0);

    expect(tracker.getRemainingAgentBudget('agent-reset-test')).toBeCloseTo(1.0, 5);

    tracker.resetAgent('agent-reset-test');
    expect(tracker.getRemainingAgentBudget('agent-reset-test')).toBe(2.0);

    tracker.resetTeam();
    expect(tracker.getRemainingTeamBudget()).toBe(10.0);
  });
});
