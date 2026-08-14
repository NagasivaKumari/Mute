'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Badge } from '../../components/ui/index';
import { RiskBadge } from '../../components/ui/risk-badge';
import { api } from '../../lib/api-client';
import { formatDate, decisionVariant } from '../../lib/utils';
import type { Approval } from '@sentinel/types';

function ApprovalsContent() {
  const queryClient = useQueryClient();

  const { data: pending = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api<Approval[]>('/approvals?status=pending'),
  });

  const { data: all = [] } = useQuery({
    queryKey: ['approvals-all'],
    queryFn: () => api<Approval[]>('/approvals'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api(`/approvals/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-all'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api(`/approvals/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      queryClient.invalidateQueries({ queryKey: ['approvals-all'] });
    },
  });

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">Approval Center</h1>
      <p className="mb-8 text-sm text-zinc-500">
        High-risk actions require explicit human approval before execution
      </p>

      <Card className="mb-8">
        <h2 className="mb-4 font-semibold">Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending approvals — all actions are autonomous or policy-governed</p>
        ) : (
          <div className="space-y-4">
            {pending.map((a) => (
              <div
                key={a.id}
                className="rounded border border-zinc-800 p-4"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-medium">{a.action}</span>
                      <span className="text-zinc-600">→</span>
                      <span className="text-sm text-zinc-400">{a.resource}</span>
                    </div>
                    {a.reason && (
                      <div className="rounded bg-zinc-900 p-3 text-xs text-zinc-400 whitespace-pre-wrap">
                        {a.reason}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-zinc-600">
                      <span>Risk Score: {a.riskScore ?? 'N/A'}</span>
                      <span>Requested: {formatDate(a.createdAt)}</span>
                      {a.expiresAt && <span>Expires: {formatDate(a.expiresAt)}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <RiskBadge level={a.riskScore && a.riskScore >= 71 ? 'high' : 'medium'} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMutation.mutate(a.id)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(a.id)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 pr-4">Action</th>
                <th className="pb-3 pr-4">Resource</th>
                <th className="pb-3 pr-4">Risk</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {all
                .filter((a) => a.status !== 'pending')
                .slice(0, 20)
                .map((a) => (
                  <tr key={a.id} className="border-b border-zinc-900">
                    <td className="py-3 pr-4 text-xs">{formatDate(a.createdAt)}</td>
                    <td className="py-3 pr-4 font-mono">{a.action}</td>
                    <td className="py-3 pr-4">{a.resource}</td>
                    <td className="py-3 pr-4">
                      <RiskBadge level={a.riskScore && a.riskScore >= 71 ? 'high' : 'medium'} />
                    </td>
                    <td className="py-3">
                      <Badge variant={decisionVariant(a.status)}>{a.status}</Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <AuthGuard>
      <ApprovalsContent />
    </AuthGuard>
  );
}
