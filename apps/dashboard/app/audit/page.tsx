'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Badge } from '../../components/ui/index';
import { RiskBadge } from '../../components/ui/risk-badge';
import { api } from '../../lib/api-client';
import { formatDate, decisionVariant, riskLevelStyle } from '../../lib/utils';
import { FlareTxLink } from '@sentinel/ui';
import type { AuditLog, PaginatedResponse } from '@sentinel/types';

function AuditContent() {
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean>>({});
  const [riskFilter, setRiskFilter] = useState<string>('');

  const { data, refetch } = useQuery({
    queryKey: ['audit', riskFilter],
    queryFn: () =>
      api<PaginatedResponse<AuditLog>>(
        `/audit?limit=50${riskFilter ? `&riskLevel=${riskFilter}` : ''}`,
      ),
  });

  const verifyMutation = useMutation({
    mutationFn: (auditId: string) =>
      api<{ verified: boolean; hash: string }>(`/verification/audit/${auditId}`, {
        method: 'POST',
      }),
    onSuccess: (result, auditId) => {
      setVerifyResult((prev) => ({ ...prev, [auditId]: result.verified }));
      setVerifying(null);
    },
  });

  const entries = data?.items ?? [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit &amp; Trust Timeline</h1>
          <p className="mt-1 text-sm text-zinc-500">Every action, cryptographically anchored to Flare</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {['', 'low', 'medium', 'high'].map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`rounded px-3 py-1 text-xs transition-colors ${
                  riskFilter === level
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:bg-zinc-800'
                }`}
              >
                {level || 'All'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="pb-3 pr-4">Timestamp</th>
              <th className="pb-3 pr-4">Action</th>
              <th className="pb-3 pr-4">Resource</th>
              <th className="pb-3 pr-4">Risk</th>
              <th className="pb-3 pr-4">Decision</th>
              <th className="pb-3 pr-4">Policy</th>
              <th className="pb-3 pr-4">Flare</th>
              <th className="pb-3">Verify</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-zinc-900">
                <td className="py-3 pr-4 text-xs">{formatDate(entry.timestamp)}</td>
                <td className="py-3 pr-4 font-mono">{entry.action}</td>
                <td className="py-3 pr-4 max-w-[200px] truncate">{entry.resource}</td>
                <td className="py-3 pr-4">
                  <RiskBadge level={entry.riskLevel} />
                </td>
                <td className="py-3 pr-4">
                  <Badge variant={decisionVariant(entry.decision)}>{entry.decision}</Badge>
                </td>
                <td className="py-3 pr-4 text-xs text-zinc-500">
                  {entry.policyName ?? '—'}
                </td>
                <td className="py-3 pr-4">
                  {entry.flareTxHash ? (
                    <FlareTxLink txHash={entry.flareTxHash} />
                  ) : (
                    <span className="text-zinc-600">pending</span>
                  )}
                </td>
                <td className="py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={verifying === entry.id}
                    onClick={() => {
                      setVerifying(entry.id);
                      verifyMutation.mutate(entry.id);
                    }}
                  >
                    {verifyResult[entry.id] === true
                      ? '✓ Verified'
                      : verifyResult[entry.id] === false
                        ? '✗ Mismatch'
                        : 'Verify'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && (
        <Card className="mt-4">
          <p className="text-zinc-500">No audit entries yet.</p>
        </Card>
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <AuthGuard>
      <AuditContent />
    </AuthGuard>
  );
}
