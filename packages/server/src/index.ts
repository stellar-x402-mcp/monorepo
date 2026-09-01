export * from './server.js';
export * from './tools/account.js';
export * from './tools/contract.js';

export async function start() {
  const { runStdioServer } = await import('./server.js');
  await runStdioServer();
}
