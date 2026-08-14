'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '../components/layout/auth-guard';
import { Card, Badge, Button, Input } from '../components/ui/index';
import { RiskBadge } from '../components/ui/risk-badge';
import { api, setTokens, isAuthenticated } from '../lib/api-client';
import { useAuthStore } from '../stores/auth-store';
import { formatDate, timeAgo, decisionVariant, cn } from '../lib/utils';
import type { Agent, Approval, AuditLog, Organization, PaginatedResponse, User } from '@sentinel/types';
import { FlareTxLink } from '@sentinel/ui';
import { ShieldCheck, KeyRound, ScrollText, Fingerprint, Eye, EyeOff } from 'lucide-react';

function LandingContent() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleWalletClick() {
    setError('');
    if (typeof window === 'undefined') return;
    const providers: any[] = (window as any).ethereum?.providers ?? [];
    const eth =
      (window as any).bifrost ??
      (window as any).ethereum?.isBifrost === true
        ? (window as any).ethereum
        : providers.find((p: any) => p.isBifrost === true) ??
          (window as any).ethereum;
    if (!eth) {
      setError('No Flare wallet detected. Install Bifrost Wallet, then connect.');
      return;
    }
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      const address = accounts[0] as string;
      const short = `${address.slice(0, 8)}...${address.slice(-6)}`;
      if (isAuthenticated()) {
        router.push('/');
        return;
      }
      const chainId = await eth.request({ method: 'eth_chainId' });
      if (chainId !== '0x72') {
        try {
          await eth.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x72' }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            try {
              await eth.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x72',
                  chainName: 'Flare Coston2',
                  nativeCurrency: { name: 'C2FLR', symbol: 'C2FLR', decimals: 18 },
                  rpcUrls: ['https://coston2-api.flare.network/ext/C/rpc'],
                  blockExplorerUrls: ['https://coston2-explorer.flare.network'],
                }],
              });
              await eth.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x72' }],
              });
            } catch {
              setError('Sentinel requires Flare Coston2 (chainId 114). Please switch your wallet network.');
              return;
            }
          } else {
            setError('Sentinel requires Flare Coston2 (chainId 114). Please switch your wallet network.');
            return;
          }
        }
      }
      try {
        const challenge = await api<{ message: string }>('/auth/wallet/challenge', {
          method: 'POST',
          body: JSON.stringify({ address }),
        });
        const signature = await eth.request({
          method: 'personal_sign',
          params: [challenge.message, address],
        });
        const data = await api<{
          accessToken: string;
          refreshToken: string;
          user: User;
          organization: Organization | null;
        }>('/auth/wallet/login', {
          method: 'POST',
          body: JSON.stringify({ address, signature }),
        });
        setTokens(data.accessToken, data.refreshToken);
        setAuth(data.user, data.organization, {
          access: data.accessToken,
          refresh: data.refreshToken,
        });
        router.push('/');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Wallet login failed';
        setError(
          msg.includes('not linked')
            ? `Wallet connected: ${short}. This wallet isn't linked and verified to any organization.`
            : `Wallet connected: ${short}. Login failed: ${msg}`,
        );
      }
    } catch {
      setError('Wallet connection cancelled or failed.');
    }
  }

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const data = await api<{
        accessToken: string;
        refreshToken: string;
        user: User;
        organization: Organization | null;
      }>(mode === 'login' ? '/auth/login' : '/auth/register', {
        method: 'POST',
        body: JSON.stringify(
          mode === 'login'
            ? { email, password }
            : { organizationName: orgName, email, password, firstName, lastName },
        ),
      });
      setTokens(data.accessToken, data.refreshToken);
      setAuth(data.user, data.organization, {
        access: data.accessToken,
        refresh: data.refreshToken,
      });
      router.push('/');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  }

  const features = [
    {
      icon: ShieldCheck,
      title: 'Policy enforcement',
      desc: 'Every agent action is gated by policy — approved, blocked, or escalated.',
      color: 'text-blue-400',
    },
    {
      icon: KeyRound,
      title: 'Secret protection',
      desc: 'Secrets are masked at the source, never exposed to the model or the log.',
      color: 'text-green-400',
    },
    {
      icon: Fingerprint,
      title: 'Flare-wallet identity',
      desc: 'Organizations prove ownership with a verified Flare wallet.',
      color: 'text-purple-400',
    },
    {
      icon: ScrollText,
      title: 'Immutable audit',
      desc: 'Every decision is hashed and anchored on-chain for tamper-proof review.',
      color: 'text-yellow-400',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between p-6">
          <div>
            <h1 className="text-lg font-bold">Sentinel Policy Mesh</h1>
            <p className="text-xs text-zinc-500">Confidential policy enforcement for autonomous AI agents</p>
          </div>
          <Button onClick={handleWalletClick} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect Flare Wallet'}
          </Button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-16">
        <section className="mb-16 text-center">
          <p className="mb-4 inline-block rounded-full border border-zinc-800 bg-zinc-900 px-4 py-1 text-xs text-zinc-400">
            Trusted execution on Flare Confidential Compute
          </p>
          <h2 className="mx-auto mb-6 max-w-3xl text-4xl font-bold leading-tight">
            Don&apos;t trust the AI. <span className="text-blue-400">Trust the chain.</span>
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-zinc-400">
            Sentinel sits between your AI agents and the outside world — enforcing policy,
            protecting secrets, and anchoring every decision on Flare.
          </p>
          <Button size="lg" onClick={handleWalletClick} disabled={loading}>
            {loading ? 'Connecting...' : 'Connect your Flare wallet to continue'}
          </Button>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mx-auto mt-10 max-w-sm text-left">
            <div className="mb-4 flex rounded-md border border-zinc-800 p-1 text-sm">
              <button
                className={cn('flex-1 rounded px-3 py-1', mode === 'login' ? 'bg-zinc-800' : 'text-zinc-500')}
                onClick={() => setMode('login')}
              >
                Log in
              </button>
              <button
                className={cn('flex-1 rounded px-3 py-1', mode === 'register' ? 'bg-zinc-800' : 'text-zinc-500')}
                onClick={() => setMode('register')}
              >
                Register
              </button>
            </div>
            <form onSubmit={handleAuthSubmit} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-5">
              {mode === 'register' && (
                <>
                  <Input placeholder="Organization name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                  <div className="flex gap-3">
                    <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </>
              )}
              <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {authError && <p className="text-sm text-red-400">{authError}</p>}
              <Button type="submit" className="w-full" disabled={authLoading}>
                {authLoading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
              </Button>
            </form>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <Card key={title}>
              <Icon className={`mb-4 ${color}`} size={28} />
              <h3 className="mb-2 font-semibold">{title}</h3>
              <p className="text-sm text-zinc-500">{desc}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}

function DashboardContent() {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api<Agent[]>('/agents'),
  });

  const { data: approvals = [] } = useQuery({
    queryKey: ['approvals'],
    queryFn: () => api<Approval[]>('/approvals?status=pending'),
  });

  const { data: audit } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api<PaginatedResponse<AuditLog>>('/audit?limit=5'),
  });

  const { data: flare } = useQuery({
    queryKey: ['flare-status'],
    queryFn: () => api<{ online: boolean; network: string }>('/flare/status'),
  });

  const { data: verification } = useQuery({
    queryKey: ['verification-summary'],
    queryFn: () => api<{ overall: boolean; policies: { verified: boolean }[]; recentAudits: { verified: boolean }[] }>('/verification/summary'),
  });

  const onlineAgents = agents.filter((a) => a.status === 'online').length;
  const blockedToday = audit?.items.filter((a) => a.decision === 'deny').length ?? 0;
  const highRiskToday = audit?.items.filter((a) => a.riskLevel === 'high').length ?? 0;
  const verifiedCount = verification?.recentAudits?.filter((a) => a.verified).length ?? 0;
  const totalAudits = verification?.recentAudits?.length ?? 0;

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-bold">Sentinel — Runtime OS</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative">
          <p className="text-sm text-zinc-500">What is happening right now?</p>
          <p className="mt-2 text-3xl font-bold">{audit?.items.length ?? 0}</p>
          <p className="text-xs text-zinc-600">runtime events today</p>
          <Link href="/activity" className="absolute right-4 top-4 text-xs text-blue-400 hover:underline">
            View →
          </Link>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Is anything risky?</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-bold">{highRiskToday}</p>
            <RiskBadge level="high" />
          </div>
          <p className="text-xs text-zinc-600">high-risk actions flagged</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Are policies enforced?</p>
          <p className="mt-2 text-3xl font-bold">{blockedToday}</p>
          <p className="text-xs text-zinc-600">actions blocked by policy</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Is the trust chain intact?</p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-bold">{verifiedCount}/{totalAudits}</p>
            <Badge variant={verifiedCount === totalAudits && totalAudits > 0 ? 'success' : 'warning'}>
              {verification?.overall ? 'Verified' : 'Pending'}
            </Badge>
          </div>
          <p className="text-xs text-zinc-600">audits verified on Flare</p>
          <Link href="/verification" className="absolute right-4 top-4 text-xs text-blue-400 hover:underline">
            View →
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          {audit?.items.length === 0 && (
            <p className="text-sm text-zinc-500">No activity yet</p>
          )}
          <div className="space-y-3">
            {audit?.items.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-zinc-800 pb-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <RiskBadge level={entry.riskLevel} />
                  <div>
                    <span className="font-mono">{entry.action}</span>
                    <span className="text-zinc-500"> → {entry.resource}</span>
                    {entry.policyName && (
                      <span className="ml-2 text-xs text-zinc-600">via {entry.policyName}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">{timeAgo(entry.timestamp)}</span>
                  <Badge variant={decisionVariant(entry.decision)}>{entry.decision}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="mb-4 font-semibold">Pending Approvals</h2>
            {approvals.length === 0 ? (
              <p className="text-sm text-zinc-500">All clear — no approvals waiting</p>
            ) : (
              <div className="space-y-3">
                {approvals.slice(0, 5).map((a) => (
                  <Link
                    key={a.id}
                    href="/approvals"
                    className="block rounded border border-zinc-800 p-3 text-sm hover:border-zinc-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{a.action}</span>
                      <RiskBadge level={a.riskScore && a.riskScore >= 71 ? 'high' : 'medium'} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{a.resource}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Flare Network</h2>
            <div className="flex items-center gap-3">
              <Badge variant={flare?.online ? 'success' : 'warning'}>
                {flare?.online ? 'Connected' : 'Queue Mode'}
              </Badge>
              <span className="text-xs text-zinc-600">{flare?.network ?? 'coston2'}</span>
            </div>
            {audit?.items[0]?.flareTxHash && (
              <div className="mt-4 border-t border-zinc-800 pt-4">
                <p className="mb-1 text-xs text-zinc-500">Latest attestation</p>
                <FlareTxLink txHash={audit.items[0].flareTxHash} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const authUser = useAuthStore((s) => s.user);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(!!authUser || isAuthenticated());
  }, [authUser]);

  return authed ? (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  ) : (
    <LandingContent />
  );
}
