# Frontend — Dashboard UI & Engineering

**Version:** 2.0  
**Status:** Locked

---

## Stack

| Tool | Purpose |
|------|---------|
| Next.js 15 (App Router) | Framework |
| TypeScript | Language |
| TailwindCSS | Styling |
| shadcn/ui | Components |
| Lucide React | Icons |
| TanStack Query | Server state |
| Zustand | Client state |
| React Hook Form + Zod | Forms |
| Recharts | Charts (minimal for MVP) |

**Hosting:** Vercel

---

## Routes

| Route | Page |
|-------|------|
| `/` | Dashboard overview |
| `/login` | Authentication |
| `/register` | Registration |
| `/projects` | Project list |
| `/projects/[id]` | Project details |
| `/agents` | AI agent list |
| `/agents/[id]` | Agent details |
| `/policies` | Policy list |
| `/policies/new` | Create policy |
| `/policies/[id]` | Policy details + editor |
| `/secrets` | Secret metadata list |
| `/approvals` | Approval center |
| `/audit` | Audit explorer |
| `/settings` | Org settings, API keys |

**Removed for MVP:** `/analytics` (basic stats on dashboard instead).

---

## Layout

```
┌──────────────────────────────────────────────────┐
│  Top Bar: Search | Notifications | Profile     │
├──────────┬───────────────────────────────────────┤
│          │                                       │
│ Sidebar  │  Main Content                         │
│          │                                       │
│ Dashboard│                                       │
│ Projects │                                       │
│ Agents   │                                       │
│ Policies │                                       │
│ Secrets  │                                       │
│ Approvals│                                       │
│ Audit    │                                       │
│ Settings │                                       │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

Dark mode by default. Responsive: sidebar collapses on mobile.

---

## Key Screens

### Dashboard

Widgets:

- Agents online count
- Pending approvals (clickable)
- Blocked actions today
- Protected secrets count
- Live activity feed (WebSocket)
- Flare connection status
- Recent audit entries

### Approval Center

Table: time, agent, action, resource, status, risk score.

Detail modal: full context, policy triggered, approve/reject buttons.

Real-time updates via WebSocket.

### Policy Editor

Simple rule builder:

```
IF [action dropdown] [operator] [value input]
THEN [decision dropdown]
```

Add/remove rules. Save publishes new version and triggers Flare hash anchor.

### Audit Explorer

Filterable table: project, agent, action, decision, date, Flare tx link.

Detail view: full audit payload, hash, verification button, session link.

---

## Folder Structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── projects/
│   ├── agents/
│   ├── policies/
│   ├── secrets/
│   ├── approvals/
│   ├── audit/
│   └── settings/
├── components/
│   ├── layout/                     # Sidebar, TopBar
│   ├── dashboard/                  # Stats, ActivityFeed
│   ├── projects/
│   ├── agents/
│   ├── policies/                   # PolicyEditor, RuleBuilder
│   ├── approvals/                  # ApprovalQueue, ApprovalModal
│   ├── audit/
│   └── ui/                         # shadcn components
├── hooks/
│   ├── use-auth.ts
│   ├── use-projects.ts
│   ├── use-approvals.ts
│   └── use-websocket.ts
├── lib/
│   ├── api-client.ts
│   └── auth.ts
├── stores/
│   └── auth-store.ts
└── types/
```

---

## API Client

```typescript
// lib/api-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers
    }
  });
  const json = await res.json();
  if (!json.success) throw new ApiError(json.error);
  return json.data;
}
```

---

## WebSocket Hook

```typescript
// hooks/use-websocket.ts
export function useWebSocket() {
  // Connect with JWT
  // Listen for: approval:created, approval:resolved, audit:created
  // Invalidate TanStack Query caches on events
}
```

---

## Auth Flow

1. Login page → POST `/auth/login` → store tokens in httpOnly cookie or localStorage
2. Middleware checks auth on protected routes
3. Refresh token rotation on 401
4. Redirect to `/login` if unauthenticated

---

## Shared UI Package

`packages/ui/` contains reusable components shared between dashboard and potentially docs site:

- StatusBadge → removed in cleanup (unused) — use `riskLevelStyle`/`RiskBadge` for risk, existing status text elsewhere
- RiskIndicator
- FlareTxLink
- AuditHashDisplay
- PolicyRuleCard

---

## MVP Scope Limits

- No analytics page (dashboard widgets suffice)
- No billing/settings beyond API keys and org name
- No user invitation flow (single user per org for demo)
- No mobile-specific layout (responsive desktop-first)
- English only

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First load | < 3s |
| Route navigation | < 200ms |
| API data fetch | < 500ms |
| WebSocket latency | < 100ms |

---

## Testing (MVP)

- Component tests for PolicyEditor, ApprovalModal
- E2E: login → create project → view approvals (Playwright)
- Manual demo rehearsal is primary validation
