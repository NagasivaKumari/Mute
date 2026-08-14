import type { CapabilityResult } from './capability-executor';

import { readFileSync, existsSync } from 'fs';
import * as path from 'node:path';
import { loadProjectConfig, SecretDetector } from '@sentinel/shared';

function safeLintPath(file: string): string | null {
  if (path.isAbsolute(file)) return null;
  if (file.includes('..')) return null;
  const normalized = path.normalize(file);
  if (normalized !== file && !normalized.startsWith('.' + path.sep)) return null;
  return normalized;
}

export function environmentValidateConfig(_secret: string | null, _params?: Record<string, unknown>): CapabilityResult {
  const config = loadProjectConfig();
  if (!config) return { ok: false, error: 'No project config found' };

  const issues: string[] = [];
  if (!config.projectId) issues.push('Missing projectId');

  return { ok: issues.length === 0, data: { config, issues } };
}

export function environmentLint(_secret: string | null, params?: Record<string, unknown>): CapabilityResult {
  const raw = (params?.file as string) || '.env.example';
  const file = safeLintPath(raw);
  if (!file) {
    return { ok: false, error: `Invalid file path: "${raw}"` };
  }

  if (!existsSync(file)) {
    return { ok: true, data: { linted: false, reason: 'File not found' } };
  }

  try {
    const content = readFileSync(file, 'utf-8');
    const issues: string[] = [];

    content.split('\n').forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      if (!trimmed.includes('=')) {
        issues.push(`Line ${i + 1}: missing "=" separator`);
      } else if (trimmed.startsWith('=')) {
        issues.push(`Line ${i + 1}: empty key`);
      }
    });

    return { ok: true, data: { file, issues } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Lint failed' };
  }
}

export function environmentRead(_secret: string | null, params?: Record<string, unknown>): CapabilityResult {
  const raw = (params?.file as string) || '.env';
  const file = safeLintPath(raw);
  if (!file) {
    return { ok: false, error: `Invalid file path: "${raw}"` };
  }

  if (!existsSync(file)) {
    return { ok: true, data: { file, found: false, maskedContent: '' } };
  }

  const content = readFileSync(file, 'utf-8');
  const { masked, detected } = SecretDetector.maskContent(content);

  return {
    ok: true,
    data: { file, found: true, maskedContent: masked, maskedKeys: detected },
  };
}
