import { vaultGet } from '@sentinel/shared';
import { databaseCheckConnectivity, databaseListTables, databaseGetSchema } from './database';
import { environmentValidateConfig, environmentLint, environmentRead } from './environment';

export interface CapabilityRequest {
  action: string;
  resource: string;
  params?: Record<string, unknown>;
}

export interface CapabilityResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface CapabilityHandler {
  action: string;
  resolveSecretName?(params?: Record<string, unknown>): string | null;
  execute(secret: string | null, params?: Record<string, unknown>): CapabilityResult | Promise<CapabilityResult>;
}

async function runHandler(
  handler: CapabilityHandler,
  dek: Buffer | undefined,
  params?: Record<string, unknown>,
): Promise<CapabilityResult> {
  const secretName = handler.resolveSecretName?.(params) ?? null;
  const secret = secretName ? vaultGet(secretName, dek) : null;
  if (secretName && !secret) {
    return { ok: false, error: `Secret "${secretName}" not found in vault` };
  }
  return handler.execute(secret, params);
}

export async function executeCapability(
  request: CapabilityRequest,
  dek: Buffer | undefined,
): Promise<CapabilityResult> {
  const handler = handlers.find((h) => h.action === request.action);
  if (!handler) {
    return { ok: false, error: `Unknown capability action: ${request.action}` };
  }
  return runHandler(handler, dek, request.params);
}

const handlers: CapabilityHandler[] = [
  {
    action: 'CAPABILITY.DATABASE.CHECK_CONNECTIVITY',
    resolveSecretName: () => null,
    execute: databaseCheckConnectivity,
  },
  {
    action: 'CAPABILITY.DATABASE.LIST_TABLES',
    resolveSecretName: () => null,
    execute: databaseListTables,
  },
  {
    action: 'CAPABILITY.DATABASE.GET_SCHEMA',
    resolveSecretName: () => null,
    execute: databaseGetSchema,
  },
  {
    action: 'CAPABILITY.ENVIRONMENT.VALIDATE_CONFIG',
    resolveSecretName: () => null,
    execute: environmentValidateConfig,
  },
  {
    action: 'CAPABILITY.ENVIRONMENT.LINT',
    resolveSecretName: () => null,
    execute: environmentLint,
  },
  {
    action: 'CAPABILITY.ENVIRONMENT.CHECK',
    resolveSecretName: () => null,
    execute: environmentRead,
  },
];
