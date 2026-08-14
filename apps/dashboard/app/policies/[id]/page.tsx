'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../../../components/layout/auth-guard';
import { Card, Button, Badge } from '../../../components/ui/index';
import { api } from '../../../lib/api-client';
import { FlareTxLink } from '@sentinel/ui';
import type { Policy } from '@sentinel/types';

const CATEGORY_LABELS: Record<string, string> = {
  secrets: 'Secrets', database: 'Database', infrastructure: 'Infrastructure',
  deployment: 'Deployment', git: 'Git', files: 'Files', network: 'Network',
  ai_agent: 'AI Agent', cloud: 'Cloud', custom: 'Custom',
};

const POLICY_TYPE_LABELS: Record<string, string> = {
  secret_access: 'Secret Access', environment: 'Environment Access', file: 'File Access',
  command: 'Command Execution', database: 'Database Operations', infrastructure: 'Infrastructure Operations',
  deploy: 'Deployment', git: 'Git Operations', network: 'Network Operations', custom: 'Custom Action',
};

const APPROVER_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', security_team: 'Security Team',
  project_admin: 'Project Admin', team_lead: 'Team Lead',
};

function PolicyDetailContent({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: policy } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => api<Policy>(`/policies/${id}`),
  });

  const cloneMutation = useMutation({
    mutationFn: () => api(`/policies/${id}/clone`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      router.push('/policies');
    },
  });

  if (!policy) return <p className="p-8 text-zinc-500">Loading...</p>;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{policy.name}</h1>
            {(policy as any).isSystem && <Badge variant="default">System</Badge>}
            <Badge variant={policy.enabled ? 'success' : 'default'}>
              {policy.enabled ? 'active' : 'disabled'}
            </Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {CATEGORY_LABELS[(policy as any).category] ?? ''} &middot; {POLICY_TYPE_LABELS[policy.type] ?? policy.type} &middot; Version {policy.version}
          </p>
        </div>
        <div className="flex gap-2">
          {(policy as any).isSystem && (
            <Button variant="outline" onClick={() => cloneMutation.mutate()} disabled={cloneMutation.isPending}>
              Clone Policy
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 font-semibold">Target</h2>
          <div className="space-y-2 text-sm">
            {policy.target?.secretName && (
              <div><span className="text-zinc-500">Secret:</span> {policy.target.secretName}</div>
            )}
            {policy.target?.actionName && (
              <div><span className="text-zinc-500">Action:</span> {policy.target.actionName}</div>
            )}
            {policy.target?.resourcePattern && (
              <div><span className="text-zinc-500">Resource Pattern:</span> <code className="text-xs">{policy.target.resourcePattern}</code></div>
            )}
            {policy.target?.environmentName && (
              <div><span className="text-zinc-500">Environment:</span> {policy.target.environmentName}</div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Conditions</h2>
          <div className="space-y-2 text-sm">
            {policy.conditions?.allowedAgents?.length ? (
              <div><span className="text-zinc-500">Allowed Agents:</span> {policy.conditions.allowedAgents.join(', ')}</div>
            ) : <div className="text-zinc-500">No agent restrictions</div>}
            {policy.conditions?.deniedAgents?.length ? (
              <div><span className="text-zinc-500">Denied Agents:</span> {policy.conditions.deniedAgents.join(', ')}</div>
            ) : null}
            {policy.conditions?.allowedEnvironments?.length ? (
              <div><span className="text-zinc-500">Allowed Environments:</span> {policy.conditions.allowedEnvironments.join(', ')}</div>
            ) : null}
            {policy.conditions?.deniedEnvironments?.length ? (
              <div><span className="text-zinc-500">Denied Environments:</span> {policy.conditions.deniedEnvironments.join(', ')}</div>
            ) : null}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold">Controls</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {policy.controls?.allowed === false ? (
            <div className="flex items-center gap-2">
              <Badge variant="danger">Denied</Badge>
              <span className="text-zinc-500">This action is blocked</span>
            </div>
          ) : (
            <>
              {policy.controls?.approvalRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Approval Required</Badge>
                  <span className="text-zinc-500">
                    Approver: {APPROVER_LABELS[policy.controls.approver ?? ''] ?? policy.controls.approver}
                  </span>
                </div>
              )}
              {policy.controls?.reasonRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="warning">Reason Required</Badge>
                </div>
              )}
              {policy.controls?.auditRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">Enhanced Audit</Badge>
                </div>
              )}
              {policy.controls?.runtimeAttestationRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">Runtime Attestation</Badge>
                </div>
              )}
              {policy.controls?.flareVerificationRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">Flare Verification</Badge>
                </div>
              )}
              {policy.controls?.verifiedPolicyRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="default">Verified Policy</Badge>
                </div>
              )}
              {policy.controls?.temporaryAccessDuration ? (
                <div><span className="text-zinc-500">Temp Access:</span> {policy.controls.temporaryAccessDuration} min</div>
              ) : null}
              {!policy.controls?.approvalRequired && !policy.controls?.reasonRequired && !policy.controls?.auditRequired &&
               !policy.controls?.runtimeAttestationRequired && !policy.controls?.flareVerificationRequired && (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Allow</Badge>
                  <span className="text-zinc-500">No additional controls</span>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold">Integrity</h2>
        <div className="space-y-2 text-sm">
          <div><span className="text-zinc-500">Policy Hash:</span></div>
          <p className="break-all font-mono text-xs">{policy.policyHash}</p>
          {policy.flareTxHash && (
            <div className="mt-3">
              <FlareTxLink txHash={policy.flareTxHash} />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <PolicyDetailContent id={id} />
    </AuthGuard>
  );
}
