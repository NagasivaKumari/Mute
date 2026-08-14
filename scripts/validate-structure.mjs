#!/usr/bin/env node
/**
 * Validates that the monorepo workspace structure is complete.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

const requiredPaths = [
  'apps/dashboard',
  'apps/runtime',
  'apps/cli',
  'apps/vscode-extension',
  'backend/src',
  'packages/types',
  'packages/shared',
  'packages/sdk',
  'packages/ui',
  'contracts',
  'docker/docker-compose.yml',
  'docs/ARCHITECTURE.md',
];

const missing = requiredPaths.filter((path) => !existsSync(join(root, path)));

if (missing.length > 0) {
  console.error('Missing required paths:');
  missing.forEach((path) => console.error(`  - ${path}`));
  process.exit(1);
}

console.log('Repository structure validation passed.');
