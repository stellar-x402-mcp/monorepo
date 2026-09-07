import { z } from 'zod';

export const QueryEventsSchema = z.object({
  startLedger: z.number().int().positive().optional().describe('Start ledger sequence number (inclusive)'),
  contractIds: z.array(z.string().min(56).max(56)).optional().describe('Soroban Contract IDs (C...)'),
  topics: z.array(z.string()).optional().describe('Event topic filters'),
  cursor: z.string().optional().describe('Pagination cursor returned from previous query'),
  limit: z.number().int().positive().max(1000).optional().describe('Maximum number of events to return'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

export async function handleQueryEvents(
  args: z.infer<typeof QueryEventsSchema>,
  sorobanRpcUrl: string
) {
  try {
    const filter: Record<string, any> = {
      type: 'contract',
    };
    if (args.contractIds && args.contractIds.length > 0) {
      filter.contractIds = args.contractIds;
    }
    if (args.topics && args.topics.length > 0) {
      filter.topics = [args.topics];
    }

    const filters = (args.contractIds || args.topics) ? [filter] : [];

    const pagination: Record<string, any> = {};
    if (args.cursor) {
      pagination.cursor = args.cursor;
    }
    if (args.limit) {
      pagination.limit = args.limit;
    }

    const params: Record<string, any> = {};
    if (args.startLedger !== undefined) {
      params.startLedger = args.startLedger;
    }
    if (filters.length > 0) {
      params.filters = filters;
    }
    if (Object.keys(pagination).length > 0) {
      params.pagination = pagination;
    }

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'getEvents',
      params,
    };

    const res = await fetch(sorobanRpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await res.json();
    if (data.error) {
      return {
        error: data.error.message || 'Soroban RPC error',
        code: data.error.code,
      };
    }

    return {
      latestLedger: data.result?.latestLedger,
      events: data.result?.events || [],
      cursor: data.result?.cursor,
    };
  } catch (err: any) {
    return { error: err.message };
  }
}
