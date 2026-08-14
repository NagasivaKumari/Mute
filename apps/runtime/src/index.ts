#!/usr/bin/env node
import { SentinelClient } from '@sentinel/sdk';
import { loadConfig, loadSessionState } from '@sentinel/shared';
import { RuntimeEngine } from './engine';
import { startRuntimeServer } from './server';

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.apiKey) {
    console.error('No API key configured. Run: sentinel login');
    process.exit(1);
  }

  const session = loadSessionState();
  if (!session) {
    console.error('No active session. Run: sentinel session start');
    process.exit(1);
  }

  const client = new SentinelClient({
    apiUrl: config.apiUrl,
    apiKey: config.apiKey,
  });

  const engine = new RuntimeEngine(client);
  client.connectWebSocket();
  startRuntimeServer(engine);

  console.log(`Session: ${session.sessionId}`);
  console.log(`Project: ${session.projectId}`);
  console.log('Runtime firewall active — fail-secure mode enabled');
}

main().catch((err) => {
  console.error('Runtime failed:', err);
  process.exit(1);
});
