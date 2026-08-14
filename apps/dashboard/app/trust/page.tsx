'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthGuard } from '../../components/layout/auth-guard';
import { Card, Button, Badge } from '../../components/ui/index';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import type { OrganizationWallet } from '@sentinel/types';

function ethereum() {
  return typeof window !== 'undefined' ? (window as any).ethereum : undefined;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

function TrustContent() {
  const queryClient = useQueryClient();
  const { organization, user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isOwner = user?.role === 'owner';

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['org-wallet'],
    queryFn: () => api<OrganizationWallet>('/organization/wallet'),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['org-wallet'] });

  async function connectWallet() {
    setError(null);
    const eth = ethereum();
    let address = typeof window !== 'undefined'
      ? window.localStorage.getItem('sentinel_pending_wallet')
      : null;
    if (!address) {
      if (!eth) {
        setError('No browser wallet detected. Install MetaMask and retry.');
        return;
      }
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      address = accounts[0] as string;
    }
    window.localStorage.removeItem('sentinel_pending_wallet');
    setBusy(true);
    try {
      const { challenge } = await api<{ challenge: string }>(
        '/organization/wallet/connect',
        { method: 'POST', body: JSON.stringify({ address }) },
      );
      const signature = await eth.request({
        method: 'personal_sign',
        params: [challenge, address],
      });
      await api('/organization/wallet/verify', {
        method: 'POST',
        body: JSON.stringify({ signature }),
      });
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Wallet connection failed');
    } finally {
      setBusy(false);
    }
  }

  async function disconnectWallet() {
    setError(null);
    setBusy(true);
    try {
      await api('/organization/wallet/disconnect', { method: 'POST' });
      refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  }

  const statusBadge = wallet
    ? wallet.trustAvailable
      ? { text: 'Trust Established', variant: 'success' as const }
      : wallet.pendingVerification
        ? { text: 'Pending Verification', variant: 'warning' as const }
        : { text: 'No Wallet Connected', variant: 'default' as const }
    : { text: '—', variant: 'default' as const };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Trust</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Optional Flare wallet — proves organization ownership on-chain. Authentication
            stays Web2; the wallet never replaces login.
          </p>
        </div>
        <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-800 bg-red-950/30 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Organization</p>
          <p className="mt-2 text-lg font-semibold">{organization?.name}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Connected Wallet</p>
          <p className="mt-2 text-lg font-semibold">
            {wallet?.walletAddress ? (
              <span className="font-mono">{shortAddr(wallet.walletAddress)}</span>
            ) : (
              'None'
            )}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Flare Network</p>
          <p className="mt-2 text-lg font-semibold">
            {wallet?.walletNetwork ? `Testnet Chain ${wallet.walletNetwork}` : '—'}
          </p>
        </Card>
      </div>

      <Card className="mb-6">
        <h2 className="mb-4 font-semibold">Blockchain Trust Status</h2>
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading trust data...</p>
        ) : wallet ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Wallet address</span>
              <span className="font-mono">{wallet.walletAddress ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Verification status</span>
              <span>
                {wallet.walletVerified ? 'Verified' : wallet.walletConnected ? 'Pending' : 'Not connected'}
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Last verification</span>
              <span>{wallet.walletLastVerified ?? '—'}</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800 pb-2">
              <span className="text-zinc-500">Connected at</span>
              <span>{wallet.walletConnectedAt ?? '—'}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-zinc-500">Trust status</span>
              <Badge variant={statusBadge.variant}>{statusBadge.text}</Badge>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Unable to load trust data.</p>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-zinc-500">Policies Anchored</p>
          <p className="mt-2 text-3xl font-bold">{wallet?.counts.policiesAnchored ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Approvals Anchored</p>
          <p className="mt-2 text-3xl font-bold">{wallet?.counts.approvalsAnchored ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">Audit Entries Anchored</p>
          <p className="mt-2 text-3xl font-bold">{wallet?.counts.auditsAnchored ?? 0}</p>
        </Card>
      </div>

      {!wallet?.trustAvailable && (
        <div className="mb-6 rounded border border-yellow-800 bg-yellow-950/30 p-4 text-sm text-yellow-400">
          Blockchain trust is unavailable. Existing users continue working; new Flare
          attestations are paused until a wallet is connected and verified.
        </div>
      )}

      <Card>
        <h2 className="mb-2 font-semibold">Manage Wallet</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Only the organization owner can connect, verify, rotate, or disconnect the wallet.
        </p>
        {isOwner ? (
          <div className="flex gap-3">
            <Button onClick={connectWallet} disabled={busy || wallet?.trustAvailable}>
              {wallet?.pendingVerification ? 'Re-verify Wallet' : 'Connect Wallet'}
            </Button>
            <Button
              variant="outline"
              onClick={disconnectWallet}
              disabled={busy || !wallet?.walletConnected}
            >
              Disconnect Wallet
            </Button>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Your role ({user?.role}) cannot manage the organization wallet. Contact an owner.
          </p>
        )}
      </Card>
    </div>
  );
}

export default function TrustPage() {
  return (
    <AuthGuard>
      <TrustContent />
    </AuthGuard>
  );
}
