import type { SentinelConfig } from '@sentinel/shared';

export interface AuditEvent {
  action: string;
  resource: string;
  agentId?: string;
  sessionId?: string;
  projectId?: string;
  organizationId?: string;
  decision?: string;
  details?: string;
}

export async function sendAuditEvent(
  config: SentinelConfig,
  event: AuditEvent,
): Promise<void> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.accessToken) {
      headers['Authorization'] = `Bearer ${config.accessToken}`;
    }

    await fetch(`${config.apiUrl}/audit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    });
  } catch (err) {
    console.error('[audit] Failed to send audit event:', err);
  }
}
