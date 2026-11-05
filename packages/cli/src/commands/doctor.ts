import { Keypair } from '@stellar/stellar-sdk';

export interface DoctorCheckResult {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  latencyMs?: number;
  details?: Record<string, any>;
}

export interface DoctorReport {
  timestamp: string;
  healthy: boolean;
  network: string;
  checks: DoctorCheckResult[];
}

export interface DoctorOptions {
  network?: 'testnet' | 'pubnet';
  horizonUrl?: string;
  rpcUrl?: string;
  json?: boolean;
}

/**
 * Validate Node.js runtime compatibility.
 */
export function checkNodeEnvironment(): DoctorCheckResult {
  const version = process.version;
  const majorPart = version.replace('v', '').split('.')[0];
  const major = parseInt(majorPart ?? '0', 10);
  if (major >= 20) {
    return {
      name: 'Node.js Runtime',
      status: 'pass',
      message: `Node.js ${version} meets production requirement (>= v20.0.0)`,
      details: { version, major },
    };
  }
  return {
    name: 'Node.js Runtime',
    status: 'fail',
    message: `Node.js ${version} is below minimum supported version (v20.0.0+)`,
    details: { version, major },
  };
}

/**
 * Validate cryptographic signing engine and Ed25519 keypair generation.
 */
export function checkCryptoEngine(): DoctorCheckResult {
  const start = Date.now();
  try {
    const keypair = Keypair.random();
    const payload = Buffer.from('stellar-mcp-doctor-healthcheck');
    const signature = keypair.sign(payload);
    const verified = keypair.verify(payload, signature);

    if (verified) {
      return {
        name: 'Ed25519 Cryptography Engine',
        status: 'pass',
        message: 'Keypair generation and cryptographic signature verification operational',
        latencyMs: Date.now() - start,
        details: { samplePublicKey: keypair.publicKey() },
      };
    }
    return {
      name: 'Ed25519 Cryptography Engine',
      status: 'fail',
      message: 'Cryptographic signature verification returned false',
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: 'Ed25519 Cryptography Engine',
      status: 'fail',
      message: `Cryptography check threw: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check Horizon RPC endpoint health.
 */
export async function checkHorizonConnectivity(
  horizonUrl: string
): Promise<DoctorCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${horizonUrl.replace(/\/$/, '')}/`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data: any = await res.json();
      return {
        name: 'Stellar Horizon Gateway',
        status: 'pass',
        message: `Connected successfully (${res.status} OK)`,
        latencyMs: Date.now() - start,
        details: {
          coreVersion: data.core_version,
          horizonVersion: data.horizon_version,
          currentLedger: data.core_latest_ledger,
        },
      };
    }
    return {
      name: 'Stellar Horizon Gateway',
      status: 'warn',
      message: `HTTP response ${res.status}: ${res.statusText}`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: 'Stellar Horizon Gateway',
      status: 'fail',
      message: `Connection failed: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check Soroban RPC endpoint health.
 */
export async function checkSorobanRpcConnectivity(
  rpcUrl: string
): Promise<DoctorCheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (res.ok) {
      const data: any = await res.json();
      const isHealthy = data?.result?.status === 'healthy';
      return {
        name: 'Soroban RPC Engine',
        status: isHealthy ? 'pass' : 'warn',
        message: isHealthy ? 'Soroban RPC healthy and operational' : `RPC reported status: ${data?.result?.status}`,
        latencyMs: Date.now() - start,
        details: data?.result,
      };
    }
    return {
      name: 'Soroban RPC Engine',
      status: 'warn',
      message: `HTTP response ${res.status}: ${res.statusText}`,
      latencyMs: Date.now() - start,
    };
  } catch (err: any) {
    return {
      name: 'Soroban RPC Engine',
      status: 'fail',
      message: `RPC connection failed: ${err.message}`,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Execute complete doctor diagnostic suite.
 */
export async function executeDoctorDiagnostics(
  options: DoctorOptions = {}
): Promise<DoctorReport> {
  const network = options.network || 'testnet';
  const defaultHorizon =
    network === 'pubnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';
  const defaultRpc =
    network === 'pubnet'
      ? 'https://soroban-rpc.mainnet.stellar.org'
      : 'https://soroban-testnet.stellar.org';

  const horizonUrl = options.horizonUrl || defaultHorizon;
  const rpcUrl = options.rpcUrl || defaultRpc;

  const checks: DoctorCheckResult[] = [];

  // 1. Node runtime
  checks.push(checkNodeEnvironment());

  // 2. Cryptographic engine
  checks.push(checkCryptoEngine());

  // 3. Horizon RPC
  const horizonResult = await checkHorizonConnectivity(horizonUrl);
  checks.push(horizonResult);

  // 4. Soroban RPC
  const sorobanResult = await checkSorobanRpcConnectivity(rpcUrl);
  checks.push(sorobanResult);

  // Determine overall health
  const healthy = !checks.some((c) => c.status === 'fail');

  return {
    timestamp: new Date().toISOString(),
    healthy,
    network,
    checks,
  };
}

/**
 * CLI command runner for stellar-mcp doctor.
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<void> {
  const report = await executeDoctorDiagnostics(options);

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (!report.healthy) process.exit(1);
    return;
  }

  console.log('\nStellar x402 Model Context Protocol Diagnostic Healthcheck\n');
  console.log(`Network Target: ${report.network.toUpperCase()}`);
  console.log(`Timestamp:      ${report.timestamp}\n`);

  for (const check of report.checks) {
    let badge = '[ PASS ]';
    if (check.status === 'warn') badge = '[ WARN ]';
    if (check.status === 'fail') badge = '[ FAIL ]';

    const latency = check.latencyMs !== undefined ? `(${check.latencyMs}ms)` : '';
    console.log(`${badge} ${check.name} ${latency}`);
    console.log(`         ${check.message}`);
    if (check.details) {
      console.log(`         Details: ${JSON.stringify(check.details)}`);
    }
    console.log('');
  }

  if (report.healthy) {
    console.log('Result: All diagnostic checks passed. System ready for autonomous x402 settlement.\n');
  } else {
    console.error('Result: One or more diagnostic checks failed. Review output above.\n');
    process.exit(1);
  }
}
