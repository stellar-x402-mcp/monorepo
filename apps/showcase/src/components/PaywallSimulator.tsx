'use client';

import React, { useState } from 'react';

interface SimulatorStep {
  step: number;
  title: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED';
  payload?: any;
}

export function PaywallSimulator() {
  const [activeStep, setActiveStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const steps = [
    {
      title: '1. Agent Dispatches Tool Call',
      desc: 'Autonomous agent attempts invoking paywalled tool without payment headers.',
      payload: {
        method: 'tools/call',
        params: {
          name: 'stellar_get_orderbook',
          arguments: { selling: 'native', buying: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' }
        }
      }
    },
    {
      title: '2. HTTP 402 Challenge Emitted',
      desc: 'Paywall interceptor traps request, generates SEP-0043 challenge, and returns HTTP 402 with code 1120.',
      payload: {
        status: 402,
        error: 'ERR_PAYWALL_PAYMENT_REQUIRED',
        code: 1120,
        headers: {
          'X-Payment-Challenge': '0a9f8b...7c2d',
          'X-Payment-Amount': '0.0050000',
          'X-Payment-Asset': 'native',
          'X-Payment-Recipient': 'GCQURZFYPPAN76FRARROTSTYVH2LQ5AP7OLDXMJPIQ7STDOM55FXWD4T'
        }
      }
    },
    {
      title: '3. Wallet Signer Resolves Challenge',
      desc: 'Client-side InMemoryWalletSigner checks budget policy and signs payment envelope on Stellar Testnet.',
      payload: {
        payer: 'GDKF5...92KA',
        method: 'native_xlm',
        amount: '0.0050000',
        txHash: '55324f4c7277b8596452723f894fce3061a019e7cf98d080f2dfea65f5144935',
        signature: '1ee32c4573de233b83c7aca088345c3dba3c80fd0b1957e38a1ca0790032d8a4...'
      }
    },
    {
      title: '4. Verifier and Replay Protection Check',
      desc: 'OnChainTransactionVerifier confirms ledger finality. ReplayProtector claims nonce in LRU cache with TTL.',
      payload: {
        verified: true,
        network: 'stellar:testnet',
        ledgerClosed: 1048291,
        replayCheck: 'CLAIMED_NEW_NONCE',
        feePaid: '100 stroops'
      }
    },
    {
      title: '5. Tool Executes and Yields Data',
      desc: 'Tool handler executes with authenticated payment context and returns requested Stellar market data.',
      payload: {
        result: {
          bidsCount: 14,
          asksCount: 22,
          midPrice: '0.1245000',
          spreadBps: 18.2,
          settledVia: 'x402-v1'
        }
      }
    }
  ];

  const handleRunSimulation = async () => {
    setIsRunning(true);
    for (let i = 0; i < steps.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, 700));
    }
    setIsRunning(false);
  };

  const handleReset = () => {
    setActiveStep(0);
    setIsRunning(false);
  };

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Interactive x402 Payment Simulator
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
            Observe autonomous HTTP 402 challenge negotiation, Ed25519 signing, and on-chain receipt verification.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleReset}
            disabled={isRunning}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer'
            }}
          >
            Reset
          </button>
          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            style={{
              padding: '8px 20px',
              borderRadius: 6,
              backgroundColor: isRunning ? '#1f6feb' : 'var(--accent-green)',
              border: '1px solid rgba(240, 246, 252, 0.1)',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.15s ease'
            }}
          >
            {isRunning ? 'Simulating Pipeline...' : 'Run Simulation ▶'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {steps.map((step, idx) => {
          const isCurrent = activeStep === idx;
          const isPassed = activeStep > idx;

          return (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid',
                borderColor: isCurrent ? 'var(--accent-cyan)' : isPassed ? 'rgba(46, 160, 67, 0.4)' : 'var(--border)',
                borderRadius: 12,
                padding: 16,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: isCurrent ? 'var(--accent-cyan)' : isPassed ? '#3fb950' : 'var(--text-secondary)'
                }}>
                  STEP 0{idx + 1}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: isCurrent ? 'rgba(0, 240, 255, 0.15)' : isPassed ? 'rgba(46, 160, 67, 0.15)' : 'var(--bg-card)',
                  color: isCurrent ? 'var(--accent-cyan)' : isPassed ? '#3fb950' : 'var(--text-muted)'
                }}>
                  {isCurrent ? 'ACTIVE' : isPassed ? 'DONE' : 'PENDING'}
                </span>
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                {step.title}
              </h3>

              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {step.desc}
              </p>

              <pre style={{
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: 10,
                fontSize: 11,
                color: '#79c0ff',
                overflowX: 'auto',
                maxHeight: 140
              }}>
                {JSON.stringify(step.payload, null, 2)}
              </pre>
            </div>
          );
        })}
      </div>
    </section>
  );
}
