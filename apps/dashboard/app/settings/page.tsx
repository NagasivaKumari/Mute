'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Input, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import type { Organization } from '@sentinel/types';

function SettingsContent() {
  const queryClient = useQueryClient();
  const { organization } = useAuthStore();
  const [keyName, setKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [orgName, setOrgName] = useState(organization?.name ?? '');

  const { data: org } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api<Organization>('/organizations/me'),
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () =>
      api<{ id: string; name: string; keyPrefix: string; createdAt: string }[]>('/api-keys'),
  });

  const createKeyMutation = useMutation({
    mutationFn: (name: string) =>
      api<{ id: string; key: string; name: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: (data) => {
      setNewKey(data.key);
      setKeyName('');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api(`/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (name: string) =>
      api('/organizations/me', { method: 'PATCH', body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Organization</h2>
        <div className="flex gap-3">
          <Input
            value={orgName || org?.name || ''}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <Button onClick={() => updateOrgMutation.mutate(orgName)}>Save</Button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Slug: {org?.slug}</p>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">API Keys</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Used by CLI and runtime. Never share these keys.
        </p>

        <div className="mb-4 flex gap-3">
          <Input
            placeholder="Key name (e.g. CLI Runtime)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
          />
          <Button
            onClick={() => createKeyMutation.mutate(keyName)}
            disabled={!keyName}
          >
            Create Key
          </Button>
        </div>

        {newKey && (
          <div className="mb-4 rounded border border-yellow-800 bg-yellow-950/30 p-4">
            <p className="mb-2 text-sm text-yellow-400">
              Copy this key now — it won&apos;t be shown again:
            </p>
            <code className="break-all text-xs">{newKey}</code>
          </div>
        )}

        <div className="space-y-2">
          {apiKeys.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded border border-zinc-800 p-3 text-sm"
            >
              <div>
                <span>{k.name}</span>
                <span className="ml-2 font-mono text-zinc-500">{k.keyPrefix}...</span>
              </div>
              <Button size="sm" variant="destructive" onClick={() => revokeMutation.mutate(k.id)}>
                Revoke
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}
