# Production Multi-Stage Dockerfile for Stellar x402 MCP Server
FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @stellar-mcp/paywall build
RUN pnpm --filter @stellar-mcp/server build
RUN pnpm --filter @stellar-mcp/agent-client build
RUN pnpm --filter @stellar-mcp/adapters build
RUN pnpm --filter @stellar-mcp/cli build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/node_modules/ ./node_modules/

EXPOSE 3000

ENTRYPOINT ["node", "packages/cli/dist/cli.js"]
CMD ["serve", "--transport", "stdio", "--network", "testnet"]
