#!/usr/bin/env bash
set -euo pipefail

# Automated Vercel Deployment Script for stellar-x402-mcp showcase
echo "=== Deploying stellar-x402-mcp Showcase to Vercel ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "[1/3] Building workspace packages and Next.js static showcase..."
pnpm build
pnpm --filter @stellar-mcp/showcase build

TOKEN="${1:-${VERCEL_TOKEN:-}}"

if [ -z "${TOKEN}" ]; then
  echo ""
  echo "Error: Vercel authorization token not provided."
  echo "Usage: ./scripts/deploy_vercel.sh <VERCEL_TOKEN>"
  echo "Alternatively, export VERCEL_TOKEN=<your_token> and re-run."
  exit 1
fi

echo "[2/3] Deploying to Vercel production..."
export VERCEL_NO_UPDATE_NOTIFIER=1
npx -y vercel deploy apps/showcase --prod --token "${TOKEN}" --yes

echo "[3/3] Deployment complete!"
