import type { CapabilityResult } from './capability-executor';

import { spawnSync } from 'child_process';

function getDbUrl(secret: string | null): string {
  return secret || process.env.DATABASE_URL || '';
}

function runPsql(url: string, args: string[], timeout = 15_000): { stdout: string; stderr: string } | Error {
  const result = spawnSync('psql', [url, ...args], { timeout, stdio: 'pipe', windowsHide: true });
  if (result.error) return result.error;
  if (result.status !== 0) return new Error(result.stderr?.toString().trim() || `psql exited with code ${result.status}`);
  return { stdout: result.stdout?.toString() || '', stderr: result.stderr?.toString() || '' };
}

export function databaseCheckConnectivity(secret: string | null, _params?: Record<string, unknown>): CapabilityResult {
  const url = getDbUrl(secret);
  if (!url) return { ok: false, error: 'No database URL available' };

  const res = runPsql(url, ['-c', 'SELECT 1'], 10_000);
  if (res instanceof Error) return { ok: false, error: res.message };
  return { ok: true, data: { connected: true } };
}

export function databaseListTables(secret: string | null, _params?: Record<string, unknown>): CapabilityResult {
  const url = getDbUrl(secret);
  if (!url) return { ok: false, error: 'No database URL available' };

  const res = runPsql(url, ['-c', '\\dt', '--csv']);
  if (res instanceof Error) return { ok: false, error: res.message };
  const lines = res.stdout.trim().split('\n').slice(1).filter(Boolean);
  const tables = lines.map((l) => l.split(',')[0]).filter(Boolean);
  return { ok: true, data: { tables } };
}

export function databaseGetSchema(secret: string | null, params?: Record<string, unknown>): CapabilityResult {
  const url = getDbUrl(secret);
  if (!url) return { ok: false, error: 'No database URL available' };

  const table = params?.table as string | undefined;
  if (!table) return { ok: false, error: 'Table name required' };

  const res = runPsql(url, ['-c', `\\d ${table}`]);
  if (res instanceof Error) return { ok: false, error: res.message };
  return { ok: true, data: { schema: res.stdout } };
}
