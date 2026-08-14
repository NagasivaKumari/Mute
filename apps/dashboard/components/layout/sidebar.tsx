'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  Shield,
  ShieldCheck,
  Key,
  CheckCircle,
  ScrollText,
  Activity,
  Link as LinkIcon,
  Settings,
  LogOut,
  Fingerprint,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth-store';
import { api } from '../../lib/api-client';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/security', label: 'Security', icon: ShieldCheck },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/policies', label: 'Policies', icon: Shield },
  { href: '/secrets', label: 'Secrets', icon: Key },
  { href: '/approvals', label: 'Approvals', icon: CheckCircle },
  { href: '/activity', label: 'Activity', icon: Activity },
  { href: '/audit', label: 'Audit', icon: ScrollText },
  { href: '/verification', label: 'Verification', icon: LinkIcon },
  { href: '/trust', label: 'Trust', icon: Fingerprint },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, logout } = useAuthStore();

  async function handleLogout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    logout();
    router.push('/');
  }

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 p-6">
        <h1 className="text-lg font-bold">Sentinel</h1>
        <p className="text-xs text-zinc-500">{organization?.name ?? 'Policy Mesh'}</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === href
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-white',
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-zinc-800 p-4">
        <p className="mb-2 truncate text-xs text-zinc-500">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
