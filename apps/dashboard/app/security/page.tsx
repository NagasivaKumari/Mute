'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Badge, Button } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import { timeAgo } from '../../lib/utils';
import {
  ShieldCheck, FileText, Search, EyeOff, AlertTriangle,
  Play, RotateCw, CheckCircle2, XCircle,
} from 'lucide-react';

function SecurityContent() {
  const queryClient = useQueryClient();
  const [demoResult, setDemoResult] = useState<any>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const { data: audit, isRefetching } = useQuery({
    queryKey: ['security-audit'],
    queryFn: () =>
      api<{ items: any[]; total: number }>('/audit?event=FILE_READ&limit=50'),
    refetchInterval: 5000,
  });

  const items = audit?.items ?? [];
  const filesProtected = new Set(items.map((i: any) => i.resource)).size;
  const secretsFound = items.reduce((s: number, i: any) => s + (i.secretsFound ?? 0), 0);
  const secretsMasked = items.reduce((s: number, i: any) => s + (i.secretsMasked ?? 0), 0);
  const secretsExposed = items.reduce((s: number, i: any) => s + (i.secretsExposed ?? 0), 0);

  const stats = [
    { label: 'Files Protected', value: filesProtected, icon: FileText, color: 'text-blue-400' },
    { label: 'Secrets Found', value: secretsFound, icon: Search, color: 'text-yellow-400' },
    { label: 'Secrets Masked', value: secretsMasked, icon: EyeOff, color: 'text-green-400' },
    { label: 'Secrets Exposed', value: secretsExposed, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'Audit Events', value: audit?.total ?? 0, icon: ShieldCheck, color: 'text-purple-400' },
  ];

  async function runDemo() {
    setDemoLoading(true);
    setDemoError(null);
    setDemoResult(null);
    try {
      const res = await api<any>('/demo/run', { method: 'POST' });
      setDemoResult(res);
      queryClient.invalidateQueries({ queryKey: ['security-audit'] });
    } catch (e: any) {
      setDemoError(e.message ?? 'Demo failed');
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
        <Button onClick={runDemo} disabled={demoLoading}>
          {demoLoading ? (
            <><RotateCw className="mr-2 animate-spin" size={16} /> Running...</>
          ) : (
            <><Play className="mr-2" size={16} /> Run Live Demo</>
          )}
        </Button>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="flex items-center gap-4">
              <Icon className={s.color} size={28} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-zinc-500">{s.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {demoError && (
        <Card className="mb-6 border-red-800 bg-red-950/50">
          <div className="flex items-center gap-3">
            <XCircle className="text-red-400" size={20} />
            <p className="text-sm text-red-300">{demoError}</p>
          </div>
        </Card>
      )}

      {demoResult && (
        <Card className="mb-6 border-green-800 bg-green-950/20">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="text-green-400" size={20} />
            <h2 className="font-semibold text-green-300">Live Demo — Secrets Sanitized</h2>
          </div>
          <div className="mb-2 grid grid-cols-4 gap-4 text-sm">
            <div><span className="text-zinc-500">Found:</span> <span className="font-bold text-yellow-400">{demoResult.secretsFound}</span></div>
            <div><span className="text-zinc-500">Masked:</span> <span className="font-bold text-green-400">{demoResult.secretsMasked}</span></div>
            <div><span className="text-zinc-500">Exposed:</span> <span className="font-bold text-red-400">{demoResult.secretsFound - demoResult.secretsMasked}</span></div>
            <div><span className="text-zinc-500">Keys:</span> <span className="font-mono text-xs text-zinc-300">{demoResult.maskedKeys.join(', ')}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-1 text-xs font-medium text-zinc-500">ORIGINAL FILE</p>
              <pre className="overflow-auto rounded border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-300">{demoResult.original}</pre>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-green-500">SANITIZED FILE</p>
              <pre className="overflow-auto rounded border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-300">{demoResult.sanitized}</pre>
            </div>
          </div>
        </Card>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {isRefetching && <RotateCw className="animate-spin text-zinc-500" size={14} />}
      </div>
      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Secrets Found</th>
                <th className="px-4 py-3 font-medium">Secrets Masked</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No file read events yet. Click "Run Live Demo" above.
                  </td>
                </tr>
              )}
              {items.map((entry: any) => (
                <tr key={entry.id} className="border-b border-zinc-800/50 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{timeAgo(entry.timestamp)}</td>
                  <td className="px-4 py-3">{entry.agentName ?? '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">{entry.resource}</td>
                  <td className="px-4 py-3">{entry.secretsFound ?? 0}</td>
                  <td className="px-4 py-3">{entry.secretsMasked ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge variant={entry.secretsExposed ? 'danger' : 'success'}>
                      {entry.secretsExposed ? 'Exposed' : 'Masked'}
                    </Badge>
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

export default function SecurityPage() {
  return (
    <AuthGuard>
      <SecurityContent />
    </AuthGuard>
  );
}
