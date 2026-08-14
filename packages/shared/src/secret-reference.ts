export const SECRET_REFERENCE_PREFIX = 'sentinel://secret/';

export function isSecretReference(value: string): boolean {
  return value.startsWith(SECRET_REFERENCE_PREFIX);
}

export function makeSecretReference(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  return `${SECRET_REFERENCE_PREFIX}${normalized}`;
}

export function parseSecretReference(ref: string): string | null {
  if (!isSecretReference(ref)) return null;
  return ref.slice(SECRET_REFERENCE_PREFIX.length);
}

export interface EnvEntry {
  key: string;
  value: string;
  isReference: boolean;
}

export function parseEnvContent(content: string): EnvEntry[] {
  const entries: EnvEntry[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    entries.push({ key, value, isReference: isSecretReference(value) });
  }
  return entries;
}

export function serializeEnvContent(entries: EnvEntry[]): string {
  return entries.map((e) => `${e.key}=${e.value}`).join('\n') + '\n';
}
