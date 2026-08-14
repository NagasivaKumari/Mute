'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Input, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import { FlareTxLink } from '@sentinel/ui';
import type { Policy, Project, PolicyType, PolicyCategory } from '@sentinel/types';

const CATALOG_CATEGORIES: { value: PolicyCategory; label: string; icon: string }[] = [
  { value: 'secrets', label: 'Secrets', icon: '🔑' },
  { value: 'database', label: 'Database', icon: '🗄️' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
  { value: 'deployment', label: 'Deployment', icon: '🚀' },
  { value: 'git', label: 'Git', icon: '🔀' },
  { value: 'files', label: 'Files', icon: '📄' },
  { value: 'network', label: 'Network', icon: '🌍' },
  { value: 'ai_agent', label: 'AI Agent', icon: '🤖' },
  { value: 'cloud', label: 'Cloud', icon: '☁️' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

const POLICY_TYPES: { value: PolicyType; label: string; icon: string }[] = [
  { value: 'secret_access', label: 'Secret Access', icon: '🔑' },
  { value: 'environment', label: 'Environment Access', icon: '🌐' },
  { value: 'file', label: 'File Access', icon: '📄' },
  { value: 'command', label: 'Command Execution', icon: '⚡' },
  { value: 'database', label: 'Database Operations', icon: '🗄️' },
  { value: 'infrastructure', label: 'Infrastructure Ops', icon: '🏗️' },
  { value: 'deploy', label: 'Deployment', icon: '🚀' },
  { value: 'git', label: 'Git Operations', icon: '🔀' },
  { value: 'network', label: 'Network Operations', icon: '🌍' },
  { value: 'custom', label: 'Custom Action', icon: '⚙️' },
];

const APPROVER_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'security_team', label: 'Security Team' },
  { value: 'project_admin', label: 'Project Admin' },
  { value: 'team_lead', label: 'Team Lead' },
];

const ENVIRONMENTS = ['development', 'staging', 'production'];

function defaultTarget(type: PolicyType) {
  switch (type) {
    case 'secret_access': return { secretName: '', actionName: '', resourcePattern: '', environmentName: '' };
    case 'environment': return { secretName: '', actionName: '', resourcePattern: '', environmentName: '' };
    case 'deploy': return { secretName: '', actionName: '', resourcePattern: '', environmentName: '' };
    default: return { secretName: '', actionName: '', resourcePattern: '', environmentName: '' };
  }
}

function defaultControls() {
  return {
    allowed: true,
    approvalRequired: false,
    approver: 'owner',
    reasonRequired: false,
    auditRequired: false,
    runtimeAttestationRequired: false,
    flareVerificationRequired: false,
    verifiedPolicyRequired: false,
    temporaryAccessDuration: 0,
  };
}

function PolicyForm({ onClose, projects }: { onClose: () => void; projects: Project[] }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'type' | 'target' | 'conditions' | 'controls'>('type');
  const [type, setType] = useState<PolicyType>('custom');
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [target, setTarget] = useState(defaultTarget('custom'));
  const [conditions, setConditions] = useState<{ allowedAgents: string; deniedAgents: string; allowedEnvironments: string; deniedEnvironments: string }>({
    allowedAgents: '', deniedAgents: '', allowedEnvironments: '', deniedEnvironments: '',
  });
  const [controls, setControls] = useState(defaultControls());

  const createMutation = useMutation({
    mutationFn: () =>
      api<Policy>('/policies', {
        method: 'POST',
        body: JSON.stringify({
          name,
          projectId: projectId || undefined,
          type,
          target: {
            secretName: target.secretName || undefined,
            actionName: target.actionName || undefined,
            resourcePattern: target.resourcePattern || undefined,
            environmentName: target.environmentName || undefined,
          },
          conditions: {
            allowedAgents: conditions.allowedAgents ? conditions.allowedAgents.split(',').map((s: string) => s.trim()) : undefined,
            deniedAgents: conditions.deniedAgents ? conditions.deniedAgents.split(',').map((s: string) => s.trim()) : undefined,
            allowedEnvironments: conditions.allowedEnvironments ? conditions.allowedEnvironments.split(',').map((s: string) => s.trim()) : undefined,
            deniedEnvironments: conditions.deniedEnvironments ? conditions.deniedEnvironments.split(',').map((s: string) => s.trim()) : undefined,
          },
          controls,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      onClose();
    },
  });

  const selectedType = POLICY_TYPES.find((t) => t.value === type);

  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <button onClick={() => setStep('type')} className={step === 'type' ? 'text-white' : 'hover:text-white'}>Type</button>
        <span>/</span>
        <button onClick={() => setStep('target')} className={step === 'target' ? 'text-white' : 'hover:text-white'}>Target</button>
        <span>/</span>
        <button onClick={() => setStep('conditions')} className={step === 'conditions' ? 'text-white' : 'hover:text-white'}>Conditions</button>
        <span>/</span>
        <button onClick={() => setStep('controls')} className={step === 'controls' ? 'text-white' : 'hover:text-white'}>Controls</button>
      </div>

      {step === 'type' && (
        <div>
          <label className="mb-2 block text-sm font-medium">Policy Type</label>
          <div className="grid grid-cols-5 gap-2">
            {POLICY_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => { setType(t.value); setTarget(defaultTarget(t.value)); }}
                className={`rounded-md border p-3 text-center text-sm transition-colors ${
                  type === t.value ? 'border-white bg-zinc-800' : 'border-zinc-700 hover:border-zinc-500'
                }`}
              >
                <div className="mb-1">{t.icon}</div>
                <div className="text-xs">{t.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">Policy Name</label>
            <Input placeholder="e.g. Production DB Access" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium">Scope</label>
            <select className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
              value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Org-wide</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <Button onClick={() => setStep('target')} disabled={!name}>Next: Target</Button>
          </div>
        </div>
      )}

      {step === 'target' && (
        <div>
          <p className="mb-3 text-sm text-zinc-400">{selectedType?.icon} {selectedType?.label} — what does this policy apply to?</p>
          {(type === 'secret_access') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Secret Name</label>
              <Input placeholder="e.g. DATABASE_URL_PROD" value={target.secretName} onChange={(e) => setTarget({ ...target, secretName: e.target.value })} />
            </div>
          )}
          {(type === 'environment') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Environment Name</label>
              <Input placeholder="e.g. production" value={target.environmentName} onChange={(e) => setTarget({ ...target, environmentName: e.target.value })} />
            </div>
          )}
          {(type === 'deploy') && (
            <div>
              <label className="mb-1 block text-sm font-medium">Deploy Action Name</label>
              <select className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                value={target.actionName} onChange={(e) => setTarget({ ...target, actionName: e.target.value })}>
                <option value="">Select action</option>
                <option value="DEPLOY">Deploy (general)</option>
                <option value="DEPLOY_PRODUCTION">Deploy to Production</option>
              </select>
            </div>
          )}
          {(type === 'custom') && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Action Name</label>
                <Input placeholder="e.g. RESTART_KUBERNETES_CLUSTER" value={target.actionName} onChange={(e) => setTarget({ ...target, actionName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Resource Pattern (regex, optional)</label>
                <Input placeholder="e.g. cluster/*/production" value={target.resourcePattern} onChange={(e) => setTarget({ ...target, resourcePattern: e.target.value })} />
              </div>
            </div>
          )}
          {(['file', 'command', 'database', 'infrastructure', 'git', 'network'] as PolicyType[]).includes(type) && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Action (leave empty for all actions in this category)</label>
                <Input placeholder="e.g. DELETE_FILE, EXEC_TERMINAL" value={target.actionName} onChange={(e) => setTarget({ ...target, actionName: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Resource Pattern (regex, optional)</label>
                <Input placeholder="e.g. \.env$" value={target.resourcePattern} onChange={(e) => setTarget({ ...target, resourcePattern: e.target.value })} />
              </div>
            </div>
          )}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep('type')}>Back</Button>
            <Button onClick={() => setStep('conditions')}>Next: Conditions</Button>
          </div>
        </div>
      )}

      {step === 'conditions' && (
        <div>
          <p className="mb-3 text-sm text-zinc-400">When should this policy apply? Leave blank to apply to all.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Allowed Agents (comma-separated)</label>
              <Input placeholder="e.g. Claude Code, Cursor" value={conditions.allowedAgents} onChange={(e) => setConditions({ ...conditions, allowedAgents: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Denied Agents (comma-separated)</label>
              <Input placeholder="e.g. GitHub Copilot" value={conditions.deniedAgents} onChange={(e) => setConditions({ ...conditions, deniedAgents: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Allowed Environments (comma-separated)</label>
              <Input placeholder="e.g. development, staging" value={conditions.allowedEnvironments} onChange={(e) => setConditions({ ...conditions, allowedEnvironments: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Denied Environments (comma-separated)</label>
              <Input placeholder="e.g. production" value={conditions.deniedEnvironments} onChange={(e) => setConditions({ ...conditions, deniedEnvironments: e.target.value })} />
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep('target')}>Back</Button>
            <Button onClick={() => setStep('controls')}>Next: Controls</Button>
          </div>
        </div>
      )}

      {step === 'controls' && (
        <div>
          <p className="mb-3 text-sm text-zinc-400">Security controls — what gates must be passed?</p>

          <div className="mb-4 rounded-md border border-zinc-800 p-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={!controls.allowed}
                onChange={(e) => setControls({ ...controls, allowed: !e.target.checked })}
                className="h-4 w-4 rounded border-zinc-600" />
              <div>
                <p className="font-medium">Deny this action</p>
                <p className="text-xs text-zinc-500">If checked, this action is always blocked</p>
              </div>
            </label>
          </div>

          {controls.allowed && (
            <>
              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.approvalRequired}
                    onChange={(e) => setControls({ ...controls, approvalRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Require Approval</p>
                    <p className="text-xs text-zinc-500">A human must approve before execution</p>
                  </div>
                </label>
                {controls.approvalRequired && (
                  <div className="mt-3 ml-7">
                    <label className="mb-1 block text-sm">Approver Role</label>
                    <select className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                      value={controls.approver} onChange={(e) => setControls({ ...controls, approver: e.target.value })}>
                      {APPROVER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.reasonRequired}
                    onChange={(e) => setControls({ ...controls, reasonRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Require Reason</p>
                    <p className="text-xs text-zinc-500">Agent must provide a reason for this action</p>
                  </div>
                </label>
              </div>

              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.auditRequired}
                    onChange={(e) => setControls({ ...controls, auditRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Enhanced Audit</p>
                    <p className="text-xs text-zinc-500">Detailed audit logging for this action</p>
                  </div>
                </label>
              </div>

              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.runtimeAttestationRequired}
                    onChange={(e) => setControls({ ...controls, runtimeAttestationRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Require Runtime Attestation</p>
                    <p className="text-xs text-zinc-500">Verify runtime integrity before execution</p>
                  </div>
                </label>
              </div>

              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.flareVerificationRequired}
                    onChange={(e) => setControls({ ...controls, flareVerificationRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Flare Verification</p>
                    <p className="text-xs text-zinc-500">Verify policy hash on-chain before enforcement</p>
                  </div>
                </label>
              </div>

              <div className="mb-4 rounded-md border border-zinc-800 p-4">
                <label className="flex items-center gap-3">
                  <input type="checkbox" checked={controls.verifiedPolicyRequired ?? false}
                    onChange={(e) => setControls({ ...controls, verifiedPolicyRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-zinc-600" />
                  <div>
                    <p className="font-medium">Require Verified Policy</p>
                    <p className="text-xs text-zinc-500">Deploy only if policy is verified on Flare</p>
                  </div>
                </label>
              </div>

              {type === 'secret_access' && (
                <div className="rounded-md border border-zinc-800 p-4">
                  <label className="mb-1 block text-sm font-medium">Temporary Access Duration (minutes)</label>
                  <input type="number" min={0} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                    value={controls.temporaryAccessDuration}
                    onChange={(e) => setControls({ ...controls, temporaryAccessDuration: parseInt(e.target.value) || 0 })} />
                  <p className="mt-1 text-xs text-zinc-500">0 = permanent access</p>
                </div>
              )}
            </>
          )}

          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep('conditions')}>Back</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : `Create ${POLICY_TYPES.find((t) => t.value === type)?.label} Policy`}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function PoliciesContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects'),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies'],
    queryFn: () => api<Policy[]>('/policies'),
  });

  const filtered = filterCategory ? policies.filter((p: Policy) => (p as any).category === filterCategory) : policies;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Trust Policies</h1>
          <p className="text-sm text-zinc-500">Define security rules for your organization — no code required</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Policy'}
        </Button>
      </div>

      {showForm && <PolicyForm onClose={() => setShowForm(false)} projects={projects} />}

      <div className="mb-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Policy Catalog</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCategory('')}
            className={`rounded-md px-3 py-1 text-xs ${!filterCategory ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            All
          </button>
          {CATALOG_CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCategory(c.value)}
              className={`rounded-md px-3 py-1 text-xs ${filterCategory === c.value ? 'bg-white text-zinc-900' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">No policies found. Create one to get started.</p>
        )}
        {filtered.map((p: Policy) => (
          <Card key={p.id}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {p.isSystem && <Badge variant="default">System</Badge>}
                <Link href={`/policies/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
                <Badge variant={p.enabled ? 'success' : 'default'}>
                  {p.enabled ? 'active' : 'disabled'}
                </Badge>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  v{p.version}
                </span>
                <span className="text-xs text-zinc-500">
                  {CATALOG_CATEGORIES.find((c) => c.value === p.category)?.icon} {CATALOG_CATEGORIES.find((c) => c.value === p.category)?.label}
                </span>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-4 gap-4 text-xs text-zinc-500">
              {p.target?.secretName && <span>Secret: {p.target.secretName}</span>}
              {p.target?.actionName && <span>Action: {p.target.actionName}</span>}
              {p.target?.environmentName && <span>Environment: {p.target.environmentName}</span>}
              {p.target?.resourcePattern && <span>Pattern: {p.target.resourcePattern}</span>}
            </div>

            <div className="mt-2 flex gap-3">
              {p.controls?.allowed === false && <Badge variant="danger">Denied</Badge>}
              {p.controls?.approvalRequired && <Badge variant="warning">Approval: {p.controls.approver}</Badge>}
              {p.controls?.flareVerificationRequired && <Badge variant="default">Flare Verified</Badge>}
              {p.controls?.runtimeAttestationRequired && <Badge variant="default">Attestation</Badge>}
              {p.controls?.reasonRequired && <Badge variant="default">Reason</Badge>}
              {p.controls?.auditRequired && <Badge variant="default">Audit</Badge>}
              {(!p.controls || (p.controls.allowed && !p.controls.approvalRequired && !p.controls.runtimeAttestationRequired)) && (
                <Badge variant="success">Allow</Badge>
              )}
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-600">
              {p.flareTxHash && <FlareTxLink txHash={p.flareTxHash} />}
              <span>Hash: {p.policyHash?.slice(0, 12)}...</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <AuthGuard>
      <PoliciesContent />
    </AuthGuard>
  );
}
