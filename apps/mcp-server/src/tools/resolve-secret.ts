import { isSecretReference, parseSecretReference } from '@sentinel/shared';
import type { SentinelConfig } from '@sentinel/shared';
import { sendAuditEvent } from '../audit.js';
import type { ToolDefinition } from './types.js';

export const resolveSecretTool: ToolDefinition = {
  name: 'resolve_secret',
  description: 'Resolve a secret reference (sentinel://secret/xxx format) to its actual value. Requires appropriate permissions.',
  schema: {
    reference: { type: 'string', description: 'Secret reference in sentinel://secret/xxx format' },
  },
  handler: async (args: Record<string, unknown>, config: SentinelConfig) => {
    const reference = args.reference as string;

    if (!isSecretReference(reference)) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Invalid secret reference format. Expected sentinel://secret/<name>' }],
        isError: true,
      };
    }

    const secretName = parseSecretReference(reference);
    if (!secretName) {
      return {
        content: [{ type: 'text' as const, text: 'Error: Could not parse secret name from reference.' }],
        isError: true,
      };
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.accessToken) {
        headers['Authorization'] = `Bearer ${config.accessToken}`;
      }

      const response = await fetch(`${config.apiUrl}/secrets/${encodeURIComponent(secretName)}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          content: [{ type: 'text' as const, text: `Error: Backend returned ${response.status}: ${body}` }],
          isError: true,
        };
      }

      const data = await response.json() as { value?: string; data?: { value?: string } };
      const value = data.value ?? data.data?.value;

      if (!value) {
        return {
          content: [{ type: 'text' as const, text: 'Error: Secret not found or empty.' }],
          isError: true,
        };
      }

      await sendAuditEvent(config, {
        action: 'SECRET_RESOLVED',
        resource: `secret:${secretName}`,
        decision: 'ALLOWED',
      });

      return {
        content: [{ type: 'text' as const, text: `Resolved: ${value}` }],
      };
    } catch (err) {
      return {
        content: [{ type: 'text' as const, text: `Error: Failed to resolve secret — ${(err as Error).message}` }],
        isError: true,
      };
    }
  },
};
