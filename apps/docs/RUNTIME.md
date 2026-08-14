# Runtime, CLI & VS Code Extension

**Version:** 2.0  
**Status:** Locked  
**Runtime:** TypeScript, Node.js

---

## Overview

The Sentinel Runtime is a local Node.js daemon that intercepts AI agent actions before they execute. It communicates with the NestJS backend via REST and WebSocket.

---

## Runtime Modules

| Module | Responsibility |
|--------|----------------|
| Session Manager | Create/close isolated AI sessions |
| Capability Manager | Load and enforce agent capabilities |
| Runtime Firewall | Intercept file, shell, git, network, secret actions |
| Policy Client | POST `/runtime/evaluate` to backend |
| Secret Broker | Request temporary credentials via backend |
| Approval Manager | Poll/WebSocket for approval decisions |
| Audit Client | POST `/audit` for every evaluated action |
| Flare Client | Trigger hash anchoring via backend |

---

## Intercepted Actions

| Action | Example |
|--------|---------|
| `READ_FILE` | Read `.env`, `id_rsa` |
| `WRITE_FILE` | Modify source files |
| `DELETE_FILE` | Delete files |
| `EXEC_TERMINAL` | Run shell commands |
| `GIT_PUSH` | Push to remote |
| `GIT_COMMIT` | Commit changes |
| `READ_SECRET` | Access secret by name |
| `NETWORK_REQUEST` | HTTP calls |
| `DEPLOY` | Deploy to environment |

---

## Runtime Lifecycle

```
1. sentinel session start
2. Authenticate with API key
3. POST /sessions → receive sessionId
4. GET /runtime/policies → load active policies
5. Load agent capabilities
6. Connect WebSocket for approval events
7. Intercept actions → evaluate → execute decision
8. POST /audit for every action
9. sentinel session stop → POST /sessions/:id/end
```

---

## Example Flow

```
Cursor requests: READ_FILE ".env"
    │
    ▼
Runtime Firewall intercepts
    │
    ▼
Capability check: READ_FILE → approval_required
    │
    ▼
POST /runtime/evaluate
    │
    ▼
Response: { decision: "approval_required", approvalId: "..." }
    │
    ▼
Runtime pauses → notifies VS Code + dashboard
    │
    ▼
User approves via dashboard
    │
    ▼
WebSocket: approval:resolved { status: "approved" }
    │
    ▼
Runtime allows action → POST /audit
    │
    ▼
Backend anchors audit hash on Flare (async)
```

---

## Risk Scoring (MVP)

Simple heuristic, 0–100:

| Factor | Score |
|--------|-------|
| Action type (DELETE, DEPLOY) | +30 |
| Resource matches secret pattern | +25 |
| Production environment | +20 |
| First request in session | +10 |
| Previous denials in session | +15 |

Thresholds: 0–40 low, 41–70 elevated, 71+ high (always log, may escalate to approval).

---

## Secret Reference Manager (MVP)

Sentinel replaces plaintext secrets with secure references. The AI agent never receives decrypted values.

**Reference format:**

```env
OPENAI_API_KEY=sentinel://secret/openai
DATABASE_URL=sentinel://secret/database
JWT_SECRET=sentinel://secret/jwt
```

The AI agent can:

- Verify that secrets exist (metadata only)
- Validate environment configuration
- Add, rename, or remove environment variables (references only)
- Fix `.env` formatting issues

The AI agent **cannot** read plaintext secrets. Resolution happens only in the Runtime after policy evaluation, optional approval, audit logging, and Flare attestation.

### Secret Broker

Plaintext values are stored locally in an encrypted vault (`~/.sentinel/vault.enc`) on the developer machine.

Flow:

1. `sentinel protect` scans project `.env`, replaces values with `sentinel://secret/{name}` references
2. Metadata registered with backend via POST `/secrets` (no plaintext)
3. When the application needs a secret → policy evaluation → optional approval
4. If approved → runtime decrypts locally → injects value at runtime only
5. Access is audited and attested on Flare Testnet
6. Decrypted value never returned to the AI agent context

Backend never receives plaintext secrets.

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `sentinel login` | Authenticate and store API key locally |
| `sentinel init` | Initialize Sentinel in current project |
| `sentinel protect` | Scan and register protected files/secrets |
| `sentinel session start` | Start protected AI session |
| `sentinel session stop` | End current session |
| `sentinel status` | Show runtime and session status |
| `sentinel policy list` | List active policies |
| `sentinel audit` | Show recent audit entries |
| `sentinel approve <id>` | Approve pending request from CLI |
| `sentinel doctor` | Health check (API, runtime, Flare) |

Built with `commander` + `@sentinel/sdk`.

---

## VS Code Extension

**Package name:** `sentinel-vscode`

### Commands

| Command | Description |
|---------|-------------|
| Sentinel: Login | Authenticate |
| Sentinel: Protect Project | Run protect scan |
| Sentinel: Start Session | Start runtime session |
| Sentinel: Stop Session | End session |
| Sentinel: Open Dashboard | Open web dashboard |
| Sentinel: View Pending Approvals | Show approval queue |

### Sidebar Panel

- Current session status
- Active capabilities
- Pending approvals (with approve/reject buttons)
- Recent activity feed
- Connection status (API, runtime, Flare)

### Approval Popup

When runtime receives `approval_required`:

```
┌─────────────────────────────────────┐
│  Sentinel — Approval Required       │
│                                     │
│  Agent:  Cursor                     │
│  Action: READ_FILE                  │
│  Target: .env                       │
│  Risk:   72 (High)                  │
│                                     │
│  [Approve Once] [Reject] [Dashboard]│
└─────────────────────────────────────┘
```

Built with VS Code Extension API + `@sentinel/sdk`.

---

## SDK (`@sentinel/sdk`)

Shared TypeScript package used by runtime, CLI, and VS Code extension.

```typescript
import { SentinelClient } from '@sentinel/sdk';

const client = new SentinelClient({
  apiUrl: 'http://localhost:3001/v1',
  apiKey: process.env.SENTINEL_API_KEY
});

// Start session
const session = await client.sessions.start({ projectId, agentId });

// Evaluate action
const decision = await client.runtime.evaluate({
  sessionId: session.id,
  action: 'READ_FILE',
  resource: '.env'
});

// Subscribe to approvals
client.ws.on('approval:resolved', (event) => {
  console.log('Approval resolved:', event.status);
});
```

---

## Runtime Configuration

Local config: `~/.sentinel/config.json`

```json
{
  "apiUrl": "http://localhost:3001/v1",
  "apiKey": "sk_...",
  "defaultProject": "64f...",
  "logLevel": "info"
}
```

Project config: `.sentinel/config.json`

```json
{
  "projectId": "64f...",
  "protectedPatterns": [".env*", "*.pem", "id_rsa*"],
  "defaultPolicies": true
}
```

---

## Failure Handling

| Failure | Behavior |
|---------|----------|
| Backend offline | Deny all actions (fail secure) |
| Flare offline | Continue evaluation; queue hash anchors locally |
| Runtime crash | Session marked expired; replay audit queue on restart |
| Approval timeout | Auto-reject after 5 minutes |

---

## File Structure

```
apps/runtime/
├── src/
│   ├── index.ts              # Entry point / daemon
│   ├── session/
│   ├── firewall/
│   ├── policy-client/
│   ├── secret-broker/
│   ├── approval/
│   ├── audit/
│   └── config/
├── package.json
└── tsconfig.json

apps/cli/
├── src/
│   ├── index.ts
│   └── commands/
├── package.json
└── tsconfig.json

apps/vscode-extension/
├── src/
│   ├── extension.ts
│   ├── sidebar/
│   ├── approval/
│   └── commands/
├── package.json
└── tsconfig.json
```
