# Database Design — MongoDB + Mongoose

**Version:** 2.0  
**Status:** Locked  
**Stack:** MongoDB Atlas, Mongoose ODM

---

## Philosophy

Multi-tenant: one platform, many organizations. Each org owns its users, projects, agents, policies, secrets metadata, approvals, and audit logs. Cross-org access is forbidden at the application layer.

Secrets are **never** stored in MongoDB. Only metadata and encrypted references.

---

## Collections

### organizations

```typescript
{
  _id: ObjectId,
  name: string,
  slug: string,           // unique, URL-safe
  plan: 'free' | 'pro',
  status: 'active' | 'suspended',
  ownerId: ObjectId,      // ref users
  flareOrgId?: string,    // on-chain org id
  createdAt: Date,
  updatedAt: Date
}
```

### users

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  email: string,          // unique per org
  passwordHash: string,
  firstName: string,
  lastName: string,
  role: 'owner' | 'admin' | 'member',
  status: 'active' | 'invited' | 'disabled',
  lastLogin?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### projects

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  name: string,
  slug: string,
  repositoryUrl?: string,
  defaultBranch?: string,
  runtimeType: 'cursor' | 'claude' | 'copilot' | 'cli' | 'custom',
  environment: 'development' | 'staging' | 'production',
  status: 'active' | 'archived',
  createdAt: Date,
  updatedAt: Date
}
```

### agents

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  name: string,
  provider: 'anthropic' | 'openai' | 'google' | 'local' | 'custom',
  agentType: string,
  publicKey?: string,
  capabilities: [{
    name: string,         // e.g. READ_FILE, EXEC_TERMINAL
    mode: 'allow' | 'deny' | 'approval_required'
  }],
  status: 'online' | 'offline' | 'revoked',
  lastSeen?: Date,
  registeredAt: Date
}
```

### sessions

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  agentId: ObjectId,
  userId: ObjectId,
  status: 'active' | 'closed' | 'expired',
  policyVersion?: string,
  startedAt: Date,
  endedAt?: Date,
  metadata?: {
    deviceName?: string,
    ipAddress?: string
  }
}
```

### policies

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId?: ObjectId,    // null = org-wide
  name: string,
  version: number,
  enabled: boolean,
  rules: [{
    action: string,        // READ_FILE, EXEC_TERMINAL, etc.
    operator: 'equals' | 'contains' | 'matches' | 'any',
    value?: string,
    decision: 'allow' | 'deny' | 'approval_required'
  }],
  policyHash: string,      // SHA-256 of canonical JSON
  flareTxHash?: string,
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

**Example rule:**

```json
{
  "action": "READ_FILE",
  "operator": "contains",
  "value": ".env",
  "decision": "approval_required"
}
```

### secrets (metadata only)

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  name: string,
  secretType: 'api_key' | 'password' | 'ssh_key' | 'env_file' | 'other',
  status: 'active' | 'rotated' | 'revoked',
  lastAccessedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Plaintext values live in local encrypted storage on the runtime machine for MVP. Backend stores metadata only.

### approvals

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  sessionId: ObjectId,
  agentId: ObjectId,
  requestedBy: ObjectId,
  action: string,
  resource: string,
  reason?: string,
  status: 'pending' | 'approved' | 'rejected' | 'expired',
  resolvedBy?: ObjectId,
  flareTxHash?: string,
  expiresAt: Date,
  createdAt: Date,
  resolvedAt?: Date
}
```

### audit_logs

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  projectId: ObjectId,
  agentId: ObjectId,
  sessionId: ObjectId,
  action: string,
  resource: string,
  decision: 'allow' | 'deny' | 'approval_required' | 'approved' | 'rejected',
  policyId?: ObjectId,
  policyVersion?: number,
  riskScore?: number,
  hash: string,            // SHA-256 of canonical audit payload
  flareTxHash?: string,
  timestamp: Date
}
```

### api_keys

```typescript
{
  _id: ObjectId,
  organizationId: ObjectId,
  name: string,
  keyHash: string,         // bcrypt hash of key
  keyPrefix: string,       // first 8 chars for identification
  permissions: string[],
  expiresAt?: Date,
  lastUsedAt?: Date,
  createdAt: Date
}
```

---

## Indexes

```javascript
// users
{ organizationId: 1, email: 1 }  // unique

// projects
{ organizationId: 1, slug: 1 }   // unique

// agents
{ projectId: 1, status: 1 }

// sessions
{ agentId: 1, status: 1 }

// policies
{ organizationId: 1, enabled: 1 }

// approvals
{ organizationId: 1, status: 1, createdAt: -1 }

// audit_logs
{ organizationId: 1, timestamp: -1 }
{ projectId: 1, timestamp: -1 }
{ hash: 1 }                      // unique
```

---

## Mongoose Module Structure

```
backend/src/
├── schemas/
│   ├── organization.schema.ts
│   ├── user.schema.ts
│   ├── project.schema.ts
│   ├── agent.schema.ts
│   ├── session.schema.ts
│   ├── policy.schema.ts
│   ├── secret.schema.ts
│   ├── approval.schema.ts
│   ├── audit-log.schema.ts
│   └── api-key.schema.ts
```

Each NestJS feature module imports its schemas. Shared `DatabaseModule` provides Mongoose connection.

---

## Data Retention (MVP)

- Audit logs: retained indefinitely
- Sessions: closed sessions kept 90 days
- Expired approvals: kept for audit trail
- API keys: soft-delete on revoke

---

## Security

- All queries scoped by `organizationId` from JWT
- Passwords: bcrypt (cost factor 12)
- API keys: random 32-byte hex, store bcrypt hash only
- Audit hashes: SHA-256 of `{ orgId, action, resource, decision, timestamp, policyHash }`
