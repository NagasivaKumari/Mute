'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Input, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import type { Project } from '@sentinel/types';

function ProjectsContent() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api<Project[]>('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string }) =>
      api<Project>('/projects', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowForm(false);
      setName('');
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => setShowForm(!showForm)}>New Project</Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate({ name });
            }}
            className="flex gap-3"
          >
            <Input
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Button type="submit" disabled={createMutation.isPending}>
              Create
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <p className="text-zinc-500">Loading...</p>
      ) : projects.length === 0 ? (
        <Card>
          <p className="text-zinc-500">No projects yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <Card className="transition-colors hover:border-zinc-600">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-sm text-zinc-500">{p.slug}</p>
                <div className="mt-3 flex gap-2">
                  <Badge>{p.environment}</Badge>
                  <Badge variant={p.status === 'active' ? 'success' : 'default'}>
                    {p.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <ProjectsContent />
    </AuthGuard>
  );
}
