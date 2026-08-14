'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, api, clearTokens } from '../../lib/api-client';
import { useAuthStore } from '../../stores/auth-store';
import { DashboardLayout } from '../layout/sidebar';
import { useWebSocket } from '../../hooks/use-websocket';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();

  useWebSocket(Boolean(user));

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    if (!user) {
      api<{ user: Parameters<typeof setAuth>[0]; organization: Parameters<typeof setAuth>[1] }>(
        '/auth/profile',
      )
        .then((data) => setAuth(data.user, data.organization))
        .catch(() => {
          clearTokens();
          router.push('/');
        });
    }
  }, [user, router, setAuth]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
