'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import { formatDate } from '../../lib/utils';
import type { SecretMetadata } from '@sentinel/types';

interface SecretAuditEntry {
  id: string;
  action: string;
  resource: string;
  decision: string;
  riskLevel?: string;
  policyName?: string;
  timestamp: string;
}

function SecretsContent() {
  const { data: secrets = [] } = useQuery({
    queryKey: ['secrets'],
    queryFn: () =>
      api<(SecretMetadata & { reference?: string })[]>('/secrets'),
  });

  const { data: audit } = useQuery({
    queryKey: ['audit-secrets'],
    queryFn: () =>
      api<{ items: SecretAuditEntry[] }>('/audit?limit=50&action=READ_SECRET'),
  });

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">Secrets</h1>
      <p className="mb-8 text-sm text-zinc-500">
        Metadata only — plaintext values stored in local encrypted vault. AI agents see{' '}
        <code className="text-zinc-300">sentinel://secret/</code> references only.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-semibold">Registered Secrets</h2>
          {secrets.length === 0 ? (
            <Card>
              <p className="text-zinc-500">
                No secrets registered. Run <code>sentinel protect</code> in your project.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {secrets.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{s.name}</p>
                      <p className="mt-1 font-mono text-xs text-blue-400">
                        {(s as { reference?: string }).reference ?? `sentinel://secret/${s.name}`}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                        <span>Type: {s.secretType}</span>
                        {s.lastAccessedAt && <span>Last accessed: {formatDate(s.lastAccessedAt)}</span>}
                      </div>
                    </div>
                    <Badge variant={s.status === 'active' ? 'success' : 'default'}>
                      {s.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 font-semibold">Resolution History</h2>
          <Card>
            {audit?.items.length === 0 || !audit ? (
              <p className="text-sm text-zinc-500">No secret resolution events yet</p>
            ) : (
              <div className="space-y-3">
                {audit.items.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm last:border-0"
                  >
                    <div>
                      <p className="font-mono text-xs">{entry.action}</p>
                      <p className="text-xs text-zinc-500">{entry.resource}</p>
                      {entry.policyName && (
                        <p className="text-xs text-zinc-600">policy: {entry.policyName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          entry.decision === 'allow'
                            ? 'success'
                            : entry.decision === 'deny'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {entry.decision}
                      </Badge>
                      <span className="text-xs text-zinc-600">{formatDate(entry.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function SecretsPage() {
  return (
    <AuthGuard>
      <SecretsContent />
    </AuthGuard>
  );
}
