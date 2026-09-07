export * from './server.js';
export * from './tools/account.js';
export * from './tools/contract.js';
export * from './tools/payment.js';
export * from './tools/events.js';

export async function start() {
  const { runStdioServer } = await import('./server.js');
  await runStdioServer();
}
