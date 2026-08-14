'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Input, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import type { Agent, Project } from '@sentinel/types';

function AgentsContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', projectId: '' });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects'),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/agents'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; projectId: string }) =>
      api<Agent>('/agents', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          provider: 'local',
          agentType: 'custom',
          capabilities: [
            { name: 'READ_FILE', mode: 'approval_required' },
            { name: 'READ_SECRET', mode: 'approval_required' },
            { name: 'EXEC_TERMINAL', mode: 'approval_required' },
          ],
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setShowForm(false);
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Agents</h1>
        <Button onClick={() => setShowForm(!showForm)}>Register Agent</Button>
      </div>

      {showForm && (
        <Card className="mb-6 space-y-3">
          <Input
            placeholder="Agent name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.name || !form.projectId}
          >
            Register
          </Button>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-zinc-500">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Provider</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b border-zinc-900">
                <td className="py-3 pr-4">{a.name}</td>
                <td className="py-3 pr-4">{a.provider}</td>
                <td className="py-3 pr-4">{a.agentType}</td>
                <td className="py-3">
                  <Badge variant={a.status === 'online' ? 'success' : 'default'}>
                    {a.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <AuthGuard>
      <AgentsContent />
    </AuthGuard>
  );
}
