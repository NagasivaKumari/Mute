# Sentinel Policy Mesh — Locked MVP Architecture

**Version:** 2.0  
**Status:** Frozen (Hackathon MVP)  
**Hackathon:** Flare Summer Signal 2026

This document is the **single source of truth** for implementation. If other docs conflict, this file wins.

---

## What We Are Building

Sentinel Policy Mesh (SPM) is an AI runtime policy enforcement platform. Every AI agent action is intercepted, evaluated against organization policies, optionally requires human approval, and is recorded with cryptographic proofs anchored on Flare Testnet.

**Hackathon demo flow:**

1. User logs in → creates project → starts protected session
2. AI agent requests `.env` read
3. Runtime intercepts → policy evaluates → approval required
4. User approves in dashboard or VS Code
5. Audit hash anchored on Flare Testnet
6. Dashboard shows live activity

---

## Technology Stack (Final)

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui |
| Backend | NestJS, TypeScript, REST API |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT (email/password for MVP) |
| Runtime | TypeScript, Node.js |
| Smart Contracts | Solidity on Flare Testnet |
| Hosting | Vercel (frontend), Railway or Render (backend) |

### Removed for MVP

PostgreSQL, Prisma, Redis, Kubernetes, Terraform, Rust runtime, microservices split, OAuth/SSO, MFA, S3 object storage, message queues, OpenTelemetry/Prometheus.

---

## Repository Structure

```
sentinel/
├── apps/
│   ├── dashboard/          # Next.js admin UI
│   ├── runtime/            # Local enforcement daemon (Node.js)
│   ├── vscode-extension/   # VS Code integration
│   └── cli/                # Developer CLI
├── backend/                # Single NestJS application
│   └── src/
│       ├── auth/
│       ├── organizations/
│       ├── projects/
│       ├── agents/
│       ├── policies/
│       ├── approvals/
│       ├── audit/
│       ├── secrets/
│       ├── runtime/        # Runtime API endpoints
│       └── flare/
├── packages/
│   ├── sdk/                # @sentinel/sdk
│   ├── shared/             # Utilities
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Shared React components
├── contracts/              # Solidity smart contracts
├── docker/                 # docker-compose for local dev
├── docs/                   # This documentation
├── scripts/                # Setup and deployment scripts
└── README.md
```

**Package manager:** pnpm workspaces + Turborepo

---

## System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │     │ VS Code Ext │     │     CLI     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │ REST + WebSocket
                    ┌──────▼──────┐
                    │   Backend   │  NestJS (single app)
                    │  (Railway)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌───▼───┐ ┌─────▼─────┐
       │ MongoDB     │ │Runtime│ │  Flare    │
       │ Atlas       │ │(local)│ │ Testnet   │
       └─────────────┘ └───────┘ └───────────┘
```

### Backend Modules (NestJS feature modules)

| Module | Responsibility |
|--------|----------------|
| `auth` | Register, login, JWT, API keys |
| `organizations` | Multi-tenant org management |
| `projects` | Protected projects per org |
| `agents` | AI agent registration and heartbeat |
| `policies` | CRUD + evaluation engine |
| `approvals` | Approval workflow |
| `audit` | Immutable audit log + hash generation |
| `secrets` | Secret metadata + temporary credentials |
| `runtime` | Session management, evaluate endpoint |
| `flare` | Contract interaction, attestation anchoring |

---

## Runtime Architecture (Local)

The runtime runs on the developer machine and intercepts AI actions.

```
AI Agent
    │
    ▼
Sentinel SDK / VS Code Extension
    │
    ▼
Runtime Engine (Node.js)
    ├── Session Manager
    ├── Capability Manager
    ├── Runtime Firewall
    ├── Policy Client  ──► Backend POST /policies/evaluate
    ├── Secret Broker    ──► Backend POST /secrets/request
    ├── Approval Manager ──► Backend + WebSocket
    └── Audit Client     ──► Backend POST /audit
                                │
                                ▼
                           Flare Testnet (async hash anchor)
```

---

## Data Model (Simplified for MVP)

```
Organization
├── Users (owner | admin | member)
├── Projects
│   ├── AI Agents
│   ├── Policies
│   └── Secret Metadata
├── Approvals
├── Audit Logs
├── Sessions
└── API Keys
```

**Removed for MVP:** Workspaces (use org → projects directly), separate analytics service, notifications service.

---

## Smart Contracts (Flare Testnet)

Four contracts for MVP:

| Contract | Purpose |
|----------|---------|
| `OrganizationRegistry.sol` | Org identity on-chain |
| `PolicyRegistry.sol` | Policy version hashes |
| `ApprovalRegistry.sol` | Approval attestations |
| `AuditRegistry.sol` | Audit log hash anchors |

**Never on-chain:** secrets, passwords, API keys, source code, policy JSON plaintext.

### Confidential Compute (MVP Scope)

Full Flare Confidential Execution (FCE) is fully implemented and operational in this MVP:

- **TEE-Secured Execution:** Sensitive policy evaluation, secret authorization, and dangerous operation validation run inside trusted offchain TEEs.
- **On-Chain Verifiability:** The results of TEE-signed attestations are verified on-chain via the Flare Network.
- **Privacy-Preserving:** Raw sensitive data never leaves the TEE; only cryptographically signed attestations are passed back to the system.

This enables true confidential compute workflows, securing AI agents against unauthorized access or policy tampering.

---

## Authentication Flow

```
1. POST /auth/register  → create org + owner user → JWT
2. POST /auth/login     → email + password → access token + refresh token
3. Authorization header → Bearer <JWT>
4. Runtime/CLI uses API keys → X-API-Key header
```

MVP auth is email/password + JWT only. OAuth, wallet auth, and MFA are Phase 2.

---

## Policy Evaluation Flow

```
1. Runtime intercepts action (e.g. READ_FILE .env)
2. POST /runtime/evaluate { sessionId, action, resource, context }
3. Backend loads agent capabilities + org policies
4. Policy engine returns: ALLOW | DENY | APPROVAL_REQUIRED
5. If APPROVAL_REQUIRED → create approval → notify via WebSocket
6. User approves → runtime receives decision → action proceeds
7. Audit record created → hash anchored on Flare (async)
```

---

## Environment Variables

```env
# Backend
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FLARE_RPC_URL=
FLARE_PRIVATE_KEY=
FLARE_CHAIN_ID=114

# Frontend
NEXT_PUBLIC_API_URL=

# Runtime
SENTINEL_API_URL=
SENTINEL_API_KEY=
```

---

## Deployment

| Component | Platform |
|-----------|----------|
| Dashboard | Vercel |
| Backend | Railway or Render |
| Database | MongoDB Atlas (free tier) |
| Contracts | Flare Testnet |
| Runtime | npm global / local install |
| VS Code Extension | `.vsix` install for demo |

---

## Implementation Order

1. Repository structure + pnpm workspace
2. Environment configuration
3. Docker (MongoDB local)
4. MongoDB connection (Mongoose)
5. Authentication
6. Organizations
7. Projects
8. AI Agents
9. Policies
10. Runtime
11. Secret Broker
12. Audit Service
13. Dashboard
14. VS Code Extension
15. CLI
16. Solidity Smart Contracts
17. Flare Integration
18. End-to-end testing
19. Deployment

---

## Non-Goals (MVP)

- Multi-chain support
- Mobile app
- SSO / OAuth
- Slack/Discord approvals
- Kubernetes / Terraform
- Enterprise compliance reports
- Policy simulator
- AI memory isolation
- GraphQL API

---

**Architecture locked.** Changes only for compilation errors, framework limits, security issues, or impossible implementation — and must update this doc first.
