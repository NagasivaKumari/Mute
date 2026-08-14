'use client';

import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card } from '../../components/ui/index';
import { RiskBadge } from '../../components/ui/risk-badge';
import { api } from '../../lib/api-client';
import { formatDate, timeAgo, decisionVariant } from '../../lib/utils';
import type { AuditLog, PaginatedResponse } from '@sentinel/types';

function ActivityContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api<PaginatedResponse<AuditLog>>('/audit?limit=100'),
  });

  const items = data?.items ?? [];

  // Group by date
  const grouped = items.reduce<Record<string, AuditLog[]>>((acc, entry) => {
    const date = new Date(entry.timestamp).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Runtime Activity</h1>
          <p className="mt-1 text-sm text-zinc-500">Everything your AI agents did, in order</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{items.length} total events</span>
          <span>{items.filter((i) => i.decision === 'deny').length} blocked</span>
          <span>{items.filter((i) => i.riskLevel === 'high').length} high-risk</span>
        </div>
      </div>

      {isLoading && <p className="text-zinc-500">Loading...</p>}

      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date} className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-zinc-400">{date}</h2>
          <div className="relative border-l border-zinc-800 pl-6">
            {entries.map((entry, i) => (
              <div key={entry.id} className="relative mb-6 last:mb-0">
                <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-zinc-800 bg-zinc-950" />
                <Card className="ml-0">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{entry.action}</span>
                        <span className="text-zinc-600">→</span>
                        <span className="text-sm text-zinc-400">{entry.resource}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <RiskBadge level={entry.riskLevel} />
                        <span className={`text-xs ${decisionVariant(entry.decision) === 'success' ? 'text-green-400' : decisionVariant(entry.decision) === 'danger' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {entry.decision}
                        </span>
                        {entry.policyName && (
                          <span className="text-xs text-zinc-600">policy: {entry.policyName}</span>
                        )}
                        {entry.secretReferences && entry.secretReferences.length > 0 && (
                          <span className="text-xs text-purple-400">
                            secrets: {entry.secretReferences.join(', ')}
                          </span>
                        )}
                      </div>
                      {entry.riskReason && (
                        <p className="text-xs text-zinc-600">{entry.riskReason}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-zinc-600">{timeAgo(entry.timestamp)}</span>
                      {entry.flareTxHash && (
                        <p className="mt-1 text-xs text-blue-400">
                          <a
                            href={`https://coston2-explorer.flare.network/tx/${entry.flareTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            Flare ↗
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && !isLoading && (
        <Card>
          <p className="text-zinc-500">No activity yet. Activity appears here as agents execute actions.</p>
        </Card>
      )}
    </div>
  );
}

export default function ActivityPage() {
  return (
    <AuthGuard>
      <ActivityContent />
    </AuthGuard>
  );
}
