import { z } from 'zod';

export const StreamLedgerEventsSchema = z.object({
  streamType: z
    .enum(['ledgers', 'transactions', 'payments', 'operations'])
    .default('ledgers')
    .describe('Type of Horizon event stream to capture'),
  account: z
    .string()
    .min(56)
    .max(56)
    .optional()
    .describe('Stellar account address (G...) to filter account-specific events'),
  cursor: z
    .string()
    .default('now')
    .describe('Horizon paging token or "now" to stream live events'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of live events to capture before returning'),
  timeoutSeconds: z
    .number()
    .int()
    .min(1)
    .max(30)
    .default(10)
    .describe('Maximum seconds to wait for incoming stream events'),
  network: z.enum(['testnet', 'pubnet']).default('testnet').describe('Stellar network'),
});

function formatStreamItem(streamType: string, item: any) {
  if (streamType === 'ledgers') {
    return {
      sequence: item.sequence,
      hash: item.hash,
      prevHash: item.prev_hash,
      closedAt: item.closed_at,
      successfulTransactionCount: item.successful_transaction_count,
      failedTransactionCount: item.failed_transaction_count,
      operationCount: item.operation_count,
      protocolVersion: item.protocol_version,
      pagingToken: item.paging_token || String(item.sequence),
    };
  }

  if (streamType === 'transactions') {
    return {
      id: item.id,
      hash: item.hash,
      ledger: item.ledger,
      createdAt: item.created_at,
      sourceAccount: item.source_account,
      feeCharged: item.fee_charged,
      operationCount: item.operation_count,
      successful: item.successful,
      pagingToken: item.paging_token || item.id,
    };
  }

  if (streamType === 'payments') {
    return {
      id: item.id,
      type: item.type,
      from: item.from,
      to: item.to,
      amount: item.amount,
      asset: item.asset_type === 'native' ? 'XLM' : `${item.asset_code}:${item.asset_issuer}`,
      assetType: item.asset_type,
      transactionHash: item.transaction_hash,
      createdAt: item.created_at,
      pagingToken: item.paging_token || item.id,
    };
  }

  return {
    id: item.id,
    type: item.type,
    sourceAccount: item.source_account,
    transactionHash: item.transaction_hash,
    createdAt: item.created_at,
    pagingToken: item.paging_token || item.id,
  };
}

export async function handleStreamLedgerEvents(
  args: z.infer<typeof StreamLedgerEventsSchema>,
  horizonUrl: string
) {
  let endpoint = `${horizonUrl}/${args.streamType}`;
  if (args.account) {
    if (args.streamType === 'ledgers') {
      endpoint = `${horizonUrl}/ledgers`;
    } else {
      endpoint = `${horizonUrl}/accounts/${args.account}/${args.streamType}`;
    }
  }

  const url = new URL(endpoint);
  url.searchParams.set('cursor', args.cursor || 'now');

  const controller = new AbortController();
  const timeoutMs = (args.timeoutSeconds || 10) * 1000;
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const events: any[] = [];

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'text/event-stream' },
      signal: controller.signal,
    });

    if (!res.ok) {
      clearTimeout(timer);
      return { error: `Horizon streaming error: ${res.status} ${res.statusText}` };
    }

    if (!res.body) {
      clearTimeout(timer);
      return { error: 'No response body available for streaming' };
    }

    let buffer = '';
    const decoder = new TextDecoder();

    const processChunk = (chunkText: string) => {
      buffer += chunkText;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim();
          if (rawData === '"hello"' || rawData === 'hello' || rawData === '') {
            continue;
          }
          try {
            const parsed = JSON.parse(rawData);
            const formatted = formatStreamItem(args.streamType, parsed);
            events.push(formatted);
            if (events.length >= (args.limit || 5)) {
              controller.abort();
              break;
            }
          } catch {
            // Ignore non-JSON SSE lines
          }
        }
      }
    };

    const reader =
      typeof res.body.getReader === 'function'
        ? res.body.getReader()
        : typeof (res.body as any).read === 'function'
          ? (res.body as any)
          : null;

    if (reader) {
      while (events.length < (args.limit || 5)) {
        const { done, value } = await reader.read();
        if (done) break;
        processChunk(decoder.decode(value, { stream: true }));
      }
    } else if (typeof (res.body as any)[Symbol.asyncIterator] === 'function') {
      for await (const chunk of res.body as any) {
        const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        processChunk(text);
        if (events.length >= (args.limit || 5)) {
          controller.abort();
          break;
        }
      }
    }
  } catch (err: any) {
    if (err.name !== 'AbortError' && !controller.signal.aborted) {
      clearTimeout(timer);
      return { error: err.message };
    }
  } finally {
    clearTimeout(timer);
  }

  const nextCursor = events.length > 0 ? events[events.length - 1].pagingToken : args.cursor;

  return {
    streamType: args.streamType,
    eventsCaptured: events.length,
    events,
    nextCursor,
  };
}
