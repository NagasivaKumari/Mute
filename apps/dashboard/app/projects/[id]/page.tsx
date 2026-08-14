'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthGuard } from '../../../components/layout/auth-guard';
import { Card, Badge } from '../../../components/ui/index';
import { api } from '../../../lib/api-client';
import type { Project, Agent, Policy } from '@sentinel/types';

function ProjectDetailContent({ id }: { id: string }) {
  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api<Project>(`/projects/${id}`),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', id],
    queryFn: () => api<Agent[]>(`/agents?projectId=${id}`),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ['policies', id],
    queryFn: () => api<Policy[]>(`/policies?projectId=${id}`),
  });

  if (!project) return <p className="p-8 text-zinc-500">Loading...</p>;

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">{project.name}</h1>
      <p className="mb-8 text-zinc-500">{project.slug} · {project.runtimeType}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Agents ({agents.length})</h2>
          {agents.map((a) => (
            <div key={a.id} className="mb-2 flex justify-between text-sm">
              <span>{a.name}</span>
              <Badge variant={a.status === 'online' ? 'success' : 'default'}>{a.status}</Badge>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Policies ({policies.length})</h2>
          {policies.map((p) => (
            <div key={p.id} className="mb-2 text-sm">
              <span>{p.name}</span>
              <span className="ml-2 text-zinc-500">v{p.version}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <ProjectDetailContent id={id} />
    </AuthGuard>
  );
}
