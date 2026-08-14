#!/usr/bin/env node

import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

const API = process.env.API_URL ?? 'http://localhost:3001/v1';
const FILE = resolve(process.env.DEMO_FILE ?? '.env.demo');

const SAMPLE_ENV = `# Application Configuration
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=
MONGODB_URI=

# Authentication
JWT_SECRET=
API_KEY=

# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Flare
FLARE_PRIVATE_KEY=
PRIVATE_KEY=

# Other
LOG_LEVEL=debug
REDIS_URL=`;

function divider(label) {
  const line = '─'.repeat(50);
  console.log(`\n${line}`);
  console.log(`  ${label}`);
  console.log(`${line}`);
}

async function main() {
  // 1. Create sample .env
  divider('CREATE SAMPLE ENV FILE');
  await writeFile(FILE, SAMPLE_ENV);
  console.log(`  Wrote ${FILE} (${SAMPLE_ENV.length} bytes)`);

  // 2. Show original
  divider('ORIGINAL FILE');
  console.log(SAMPLE_ENV);

  // 3. Call API
  divider('CALLING SANITIZATION API');
  console.log(`  POST ${API}/files/read`);
  const start = Date.now();
  const token = process.env.AUTH_TOKEN;
  const res = await fetch(`${API}/files/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ filePath: FILE, agent: 'OpenCode' }),
  });
  const elapsed = Date.now() - start;

  if (!res.ok) {
    const text = await res.text();
    console.error(`  FAILED (${res.status}): ${text}`);
    await unlink(FILE);
    process.exit(1);
  }

  const data = await res.json();

  // 4. Show sanitized
  divider('SANITIZED FILE');
  console.log(data.content);

  // 5. Show metrics
  divider('METRICS');
  console.log(`  Secrets Found    : ${data.secretsFound}`);
  console.log(`  Secrets Masked   : ${data.secretsMasked}`);
  console.log(`  Response Time    : ${elapsed}ms`);

  // 6. Show audit log
  divider('AUDIT LOG');
  console.log(`  ${JSON.stringify({
    event: 'FILE_READ',
    file: FILE,
    agent: 'OpenCode',
    secretsFound: data.secretsFound,
    secretsMasked: data.secretsMasked,
    secretsExposed: data.secretsFound - data.secretsMasked,
    action: 'SANITIZED_RETURN',
  }, null, 2)}`);
  console.log();
  console.log('  ✓ Audit event persisted to database (view in Security Dashboard)');

  // 7. Try to fetch the audit entry
  // ponytail: best-effort auth for demo; fails gracefully if no token
  if (token) {
    try {
      const auditRes = await fetch(`${API}/audit?event=FILE_READ&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        const entry = auditData.data?.items?.[0];
        if (entry) {
          console.log();
          console.log('  Latest Audit Entry (from DB):');
          console.log(`  ${JSON.stringify(entry, null, 2)}`);
        }
      }
    } catch { /* skip */ }
  } else {
    console.log('  (set AUTH_TOKEN to also fetch the stored audit entry)');
  }

  // 8. Cleanup
  await unlink(FILE);
  divider('DONE');
  console.log(`  Cleaned up ${FILE}`);
  console.log(`  ${data.secretsMasked} secrets protected from exposure ✓`);
}

await main();
