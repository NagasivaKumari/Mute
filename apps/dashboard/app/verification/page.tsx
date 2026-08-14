'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import type { PaginatedResponse, AuditLog, Approval, Policy } from '@sentinel/types';

interface VerificationResult {
  entity: string;
  entityId: string;
  computedHash: string;
  onChain: boolean;
  verified: boolean;
  reason?: 'VERIFIED' | 'OWNER_MISMATCH' | 'WALLET_NOT_LINKED' | 'BLOCKCHAIN_UNAVAILABLE';
  flareTxHash?: string;
  explorer?: string;
}

interface VerificationSummary {
  organization: VerificationResult;
  policies: VerificationResult[];
  recentAudits: VerificationResult[];
  recentApprovals: VerificationResult[];
  overall: boolean;
}

function VerificationContent() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ['verification-summary'],
    queryFn: () => api<VerificationSummary>('/verification/summary'),
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <p className="text-zinc-500">Loading verification data...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8">
        <Card>
          <p className="text-zinc-500">No verification data available. Ensure Flare is connected.</p>
        </Card>
      </div>
    );
  }

  const allResults = [
    summary.organization,
    ...summary.policies,
    ...summary.recentAudits,
    ...summary.recentApprovals,
  ];
  const verifiedCount = allResults.filter((r) => r.verified).length;
  const onChainCount = allResults.filter((r) => r.onChain).length;

  function orgBadge(org: VerificationResult) {
    switch (org.reason) {
      case 'VERIFIED':
        return { text: '✓ Verified', variant: 'success' as const };
      case 'OWNER_MISMATCH':
        return { text: '✗ Owner Mismatch', variant: 'danger' as const };
      case 'WALLET_NOT_LINKED':
        return { text: 'Wallet Not Linked', variant: 'default' as const };
      case 'BLOCKCHAIN_UNAVAILABLE':
        return { text: 'Blockchain Unavailable', variant: 'warning' as const };
      default:
        return org.verified
          ? { text: '✓ Verified', variant: 'success' as const }
          : org.onChain
            ? { text: '✗ Not Verified', variant: 'warning' as const }
            : { text: 'Blockchain Unavailable', variant: 'warning' as const };
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verification Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Independent verification — Flare proves what happened, MongoDB can&apos;t lie
          </p>
        </div>
        <Badge variant={summary.overall ? 'success' : 'warning'}>
          {summary.overall ? 'All Verified' : 'Verification Pending'}
        </Badge>
      </div>

      {/* Overview cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Organization</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={orgBadge(summary.organization).variant}>
              {orgBadge(summary.organization).text}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Policies On-Chain</p>
          <p className="mt-2 text-3xl font-bold">
            {summary.policies.filter((p) => p.verified).length}/{summary.policies.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Audits Verified</p>
          <p className="mt-2 text-3xl font-bold">{verifiedCount}/{onChainCount}</p>
        </Card>
      </div>

      {/* Policies */}
      {summary.policies.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Policy Integrity</h2>
          <div className="space-y-3">
            {summary.policies.map((p) => (
              <div key={p.entityId} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={p.verified ? 'success' : p.onChain ? 'danger' : 'default'}>
                    {p.verified ? '✓' : p.onChain ? '✗' : '—'}
                  </Badge>
                  <span className="font-mono text-xs">{p.entityId.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="max-w-[300px] truncate font-mono text-xs text-zinc-500">
                    {p.computedHash.slice(0, 16)}...
                  </span>
                  {p.explorer && (
                    <a href={p.explorer} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent audits */}
      {summary.recentAudits.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 font-semibold">Recent Audit Attestations</h2>
          <div className="space-y-3">
            {summary.recentAudits.map((a) => (
              <div key={a.entityId} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={a.verified ? 'success' : a.onChain ? 'danger' : 'default'}>
                    {a.verified ? '✓' : a.onChain ? '✗' : '—'}
                  </Badge>
                  <span className="font-mono text-xs">{a.entityId.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="max-w-[300px] truncate font-mono text-xs text-zinc-500">
                    {a.computedHash.slice(0, 16)}...
                  </span>
                  {a.explorer && (
                    <a href={a.explorer} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent approvals */}
      {summary.recentApprovals.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold">Recent Approval Attestations</h2>
          <div className="space-y-3">
            {summary.recentApprovals.map((a) => (
              <div key={a.entityId} className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant={a.verified ? 'success' : a.onChain ? 'danger' : 'default'}>
                    {a.verified ? '✓' : a.onChain ? '✗' : '—'}
                  </Badge>
                  <span className="font-mono text-xs">{a.entityId.slice(0, 12)}...</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="max-w-[300px] truncate font-mono text-xs text-zinc-500">
                    {a.computedHash.slice(0, 16)}...
                  </span>
                  {a.explorer && (
                    <a href={a.explorer} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                      Explorer ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function VerificationPage() {
  return (
    <AuthGuard>
      <VerificationContent />
    </AuthGuard>
  );
}
