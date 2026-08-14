import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function riskLabel(score?: number): { label: string; color: string } {
  if (!score) return { label: 'Low', color: 'text-green-400' };
  if (score >= 71) return { label: 'High', color: 'text-red-400' };
  if (score >= 41) return { label: 'Elevated', color: 'text-yellow-400' };
  return { label: 'Low', color: 'text-green-400' };
}

export function riskLevelStyle(level?: string): {
  label: string;
  bg: string;
  text: string;
  dot: string;
} {
  switch (level) {
    case 'high':
      return { label: 'High', bg: 'bg-red-900/50', text: 'text-red-400', dot: 'bg-red-400' };
    case 'medium':
      return { label: 'Medium', bg: 'bg-yellow-900/50', text: 'text-yellow-400', dot: 'bg-yellow-400' };
    default:
      return { label: 'Low', bg: 'bg-green-900/50', text: 'text-green-400', dot: 'bg-green-400' };
  }
}

export function decisionVariant(decision: string): 'success' | 'danger' | 'warning' | 'default' {
  if (decision === 'allow' || decision === 'approved') return 'success';
  if (decision === 'deny' || decision === 'rejected') return 'danger';
  if (decision === 'approval_required') return 'warning';
  return 'default';
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
