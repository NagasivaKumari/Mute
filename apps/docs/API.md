# REST API Specification

**Version:** 2.0  
**Status:** Locked  
**Base URL:** `https://api.sentinel.dev/v1` (production) / `http://localhost:3001/v1` (local)

---

## Authentication

| Method | Header |
|--------|--------|
| JWT | `Authorization: Bearer <token>` |
| API Key | `X-API-Key: <key>` (runtime/CLI) |

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register org + owner user |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/profile` | Current user profile |
| POST | `/auth/logout` | Invalidate refresh token |

**Register body:**

```json
{
  "organizationName": "Acme Corp",
  "email": "dev@acme.com",
  "password": "secure-password",
  "firstName": "Jane",
  "lastName": "Dev"
}
```

**Login body:**

```json
{
  "email": "dev@acme.com",
  "password": "secure-password"
}
```

---

## Organizations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/organizations/me` | Current organization |
| PATCH | `/organizations/me` | Update organization |

---

## Projects

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create project |
| GET | `/projects` | List projects |
| GET | `/projects/:id` | Project details |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Archive project |

---

## AI Agents

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agents` | Register agent |
| GET | `/agents` | List agents (filter by projectId) |
| GET | `/agents/:id` | Agent details |
| PATCH | `/agents/:id` | Update agent |
| POST | `/agents/:id/heartbeat` | Update last seen + status |

---

## Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions` | Start runtime session |
| POST | `/sessions/:id/end` | Close session |
| GET | `/sessions` | List sessions |
| GET | `/sessions/:id` | Session details |

---

## Policies

| Method | Path | Description |
|--------|------|-------------|
| POST | `/policies` | Create policy |
| GET | `/policies` | List policies |
| GET | `/policies/:id` | Policy details |
| PATCH | `/policies/:id` | Update policy |
| DELETE | `/policies/:id` | Disable policy |
| POST | `/policies/:id/clone` | Clone a system policy |

---

## Runtime (Policy Evaluation)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/runtime/evaluate` | Evaluate an intercepted action |
| GET | `/runtime/policies` | Fetch active policies for session |

**Evaluate body:**

```json
{
  "sessionId": "64f...",
  "action": "READ_FILE",
  "resource": ".env",
  "context": {
    "agentId": "64f...",
    "projectId": "64f..."
  }
}
```

**Evaluate response:**

```json
{
  "success": true,
  "data": {
    "decision": "approval_required",
    "policyId": "64f...",
    "policyVersion": 2,
    "riskScore": 72,
    "approvalId": "64f...",
    "reason": "Reading .env files requires approval"
  }
}
```

---

## Secrets

| Method | Path | Description |
|--------|------|-------------|
| POST | `/secrets` | Register secret metadata |
| GET | `/secrets` | List secrets (metadata only) |
| GET | `/secrets/:id` | Secret metadata details |
| POST | `/secrets/request` | Request temporary access |
| DELETE | `/secrets/:id` | Revoke secret |

---

## Approvals

| Method | Path | Description |
|--------|------|-------------|
| GET | `/approvals` | List approvals (filter: status=pending) |
| GET | `/approvals/:id` | Approval details |
| POST | `/approvals/:id/approve` | Approve request |
| POST | `/approvals/:id/reject` | Reject request |

---

## Audit

| Method | Path | Description |
|--------|------|-------------|
| GET | `/audit` | Search audit logs |
| GET | `/audit/:id` | Audit entry details |
| POST | `/audit` | Create audit entry (runtime) |
| POST | `/audit/verify` | Verify hash against Flare |

**Query params for GET /audit:**

- `projectId`, `agentId`, `decision`, `from`, `to`, `page`, `limit`

---

## Flare

| Method | Path | Description |
|--------|------|-------------|
| GET | `/flare/status` | Flare network connection status |
| GET | `/flare/verify/:hash` | Verify on-chain attestation |
| POST | `/flare/anchor` | Anchor hash (internal, called by audit service) |

---

## API Keys

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api-keys` | Create API key |
| GET | `/api-keys` | List API keys |
| DELETE | `/api-keys/:id` | Revoke API key |

---

## Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Overall health check |
| GET | `/health/db` | MongoDB connection status |

---

## WebSocket Events

Connect: `ws://localhost:3001/ws?token=<JWT>`

| Event | Direction | Payload |
|-------|-----------|---------|
| `approval:created` | server → client | `{ approvalId, action, resource, agentId }` |
| `approval:resolved` | server → client | `{ approvalId, status }` |
| `audit:created` | server → client | `{ auditId, action, decision }` |
| `agent:heartbeat` | server → client | `{ agentId, status }` |

Runtime subscribes via API key to receive approval resolutions.

---

## Response Format

**Success:**

```json
{
  "success": true,
  "data": {},
  "message": "Completed"
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "POLICY_DENIED",
    "message": "Access denied by policy."
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `AUTH_FAILED` | 401 | Invalid credentials or token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `POLICY_DENIED` | 403 | Policy denied action |
| `CAPABILITY_DENIED` | 403 | Agent lacks capability |
| `APPROVAL_TIMEOUT` | 408 | Approval expired |
| `SESSION_EXPIRED` | 401 | Session no longer active |
| `FLARE_OFFLINE` | 503 | Flare network unavailable |
| `VALIDATION_ERROR` | 400 | Invalid request body |

---

## Rate Limits (MVP)

In-memory rate limiting in NestJS guard:

- Authenticated: 100 req/min
- Public (register/login): 10 req/min
- Runtime (API key): 1000 req/min

Redis-based rate limiting is Phase 2.
