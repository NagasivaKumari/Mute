'use client';

import { create } from 'zustand';
import type { Organization, User } from '@sentinel/types';
import { clearTokens, setTokens } from '../lib/api-client';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  setAuth: (user: User, org: Organization | null, tokens?: { access: string; refresh: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  setAuth: (user, organization, tokens) => {
    if (tokens) setTokens(tokens.access, tokens.refresh);
    set({ user, organization });
  },
  logout: () => {
    clearTokens();
    set({ user: null, organization: null });
  },
}));
