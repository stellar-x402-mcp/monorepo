#!/usr/bin/env bash
set -euo pipefail

echo "==> Building optimized Soroban smart contract..."
stellar contract build --manifest-path contracts/x402_channel/Cargo.toml

WASM_FILE="contracts/x402_channel/target/wasm32v1-none/release/x402_channel.wasm"

if [ ! -f "$WASM_FILE" ]; then
  echo "Error: WASM binary not found at $WASM_FILE"
  exit 1
fi

echo "==> Funding deployer key on Testnet via Friendbot..."
stellar keys fund deployer --network testnet || true

echo "==> Deploying x402_channel contract to Testnet..."
DEPLOY_OUTPUT=$(stellar contract deploy \
  --wasm "$WASM_FILE" \
  --source deployer \
  --network testnet)

echo "$DEPLOY_OUTPUT"
echo "==> Deployment completed successfully!"
