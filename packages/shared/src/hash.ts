import { createHash } from 'node:crypto';

export function sha256(data: string | Record<string, unknown>): string {
  const payload = typeof data === 'string' ? data : canonicalJson(data);
  return createHash('sha256').update(payload).digest('hex');
}

export function canonicalJson(obj: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(obj));
}

function sortKeys(value: unknown, seen = new WeakSet()): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (seen.has(value as object)) {
    return '[Circular]';
  }
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item, seen));
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = sortKeys((value as Record<string, unknown>)[key], seen);
  }
  return sorted;
}
