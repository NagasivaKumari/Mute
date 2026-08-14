import { spawnSync } from 'node:child_process';
import type { SentinelConfig } from '@sentinel/shared';
import { sendAuditEvent } from '../audit.js';
import type { ToolDefinition } from './types.js';

function classifyQuery(sql: string): 'read' | 'write' | 'dangerous' {
  const firstToken = sql.trim().split(/\s+/)[0]?.toUpperCase() ?? '';
  if (['DELETE', 'DROP', 'TRUNCATE', 'ALTER', 'REPLACE', 'GRANT', 'REVOKE'].includes(firstToken)) return 'dangerous';
  if (['INSERT', 'UPDATE', 'CREATE', 'ALTER', 'MERGE'].includes(firstToken)) return 'write';
  if (['SELECT', 'EXPLAIN', 'SHOW', 'DESCRIBE'].includes(firstToken)) return 'read';
  return 'dangerous';
}

function parseConnectionString(cs: string): { host: string; port: string; db: string; user: string; password: string } {
  const url = new URL(cs);
  return {
    host: url.hostname,
    port: url.port || '5432',
    db: url.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  };
}

export const databaseQueryTool: ToolDefinition = {
  name: 'database_query',
  description: 'Execute a SQL query against a PostgreSQL database. Read-only queries are allowed. Write queries require approval. Dangerous operations are blocked.',
  schema: {
    connectionString: { type: 'string', description: 'PostgreSQL connection string' },
    query: { type: 'string', description: 'SQL query to execute' },
  },
  handler: async (args: Record<string, unknown>, config: SentinelConfig) => {
    const connectionString = args.connectionString as string;
    const query = args.query as string;

    const classification = classifyQuery(query);

    await sendAuditEvent(config, {
      action: 'DATABASE_QUERY',
      resource: `db:${classification}`,
      decision: classification === 'read' ? 'ALLOWED' : 'BLOCKED',
      details: `Query type: ${classification}`,
    });

    if (classification === 'dangerous') {
      return {
        content: [{ type: 'text' as const, text: 'Operation blocked. Destructive queries (DELETE, DROP, TRUNCATE, etc.) require human approval.' }],
        isError: true,
      };
    }

    if (classification === 'write') {
      return {
        content: [{ type: 'text' as const, text: 'Write operations require approval. Use the web dashboard to approve this operation.' }],
        isError: true,
      };
    }

    // read query — execute via psql
    let conn: ReturnType<typeof parseConnectionString>;
    try {
      conn = parseConnectionString(connectionString);
    } catch {
      return {
        content: [{ type: 'text' as const, text: 'Error: Invalid connection string format.' }],
        isError: true,
      };
    }

    const result = spawnSync('psql', [
      '-h', conn.host,
      '-p', conn.port,
      '-U', conn.user,
      '-d', conn.db,
      '-c', query,
      '-t',
      '--no-align',
    ], {
      env: { ...process.env, PGPASSWORD: conn.password },
      encoding: 'utf-8',
      timeout: 30000,
    });

    if (result.error) {
      return {
        content: [{ type: 'text' as const, text: `Error: psql execution failed — ${result.error.message}. Is psql installed?` }],
        isError: true,
      };
    }

    if (result.status !== 0) {
      return {
        content: [{ type: 'text' as const, text: `Query error (exit ${result.status}):\n${result.stderr}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text' as const, text: result.stdout || '(no rows)' }],
    };
  },
};
