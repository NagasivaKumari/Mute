# Development Roadmap — 7-Day Hackathon Sprint

**Version:** 2.0  
**Status:** Approved  
**Duration:** 7 days

---

## Principles

1. Build the smallest working MVP
2. Every feature must be demoable
3. Flare integration must be real (Testnet transactions)
4. Single NestJS backend, not microservices
5. Ship continuously — deploy early

---

## Day 1 — Foundation & Auth

| Task | Deliverable |
|------|-------------|
| Initialize pnpm monorepo + Turborepo | Repo compiles |
| Create `apps/dashboard`, `backend`, `packages/types`, `packages/shared` | Folder structure |
| Docker Compose (MongoDB local) | `docker compose up` works |
| NestJS app with Mongoose connection | `/health` returns OK |
| Auth module: register, login, JWT | Can create account and login |
| Organizations module | Org created on register |

**Test:** `curl POST /auth/register` → `curl POST /auth/login` → JWT returned.

---

## Day 2 — Core Backend + Dashboard Shell

| Task | Deliverable |
|------|-------------|
| Projects module (CRUD) | Projects API works |
| Agents module (register, heartbeat) | Agents API works |
| Dashboard: login/register pages | Can authenticate in browser |
| Dashboard: sidebar layout + routing | Navigation works |
| Dashboard: projects page | Can create/view projects |

**Test:** Register in browser → create project → see it listed.

---

## Day 3 — Policies & Runtime Foundation

| Task | Deliverable |
|------|-------------|
| Policies module (CRUD + evaluation engine) | Policies execute |
| Runtime evaluate endpoint | POST `/runtime/evaluate` returns decisions |
| Sessions module | Start/end sessions |
| Dashboard: policies page + rule editor | Can create policies in UI |
| Dashboard: agents page | Can register agents |

**Test:** Create policy blocking `.env` reads → evaluate request → get `approval_required`.

---

## Day 4 — Approvals, Audit & Secrets

| Task | Deliverable |
|------|-------------|
| Approvals module | Approve/reject workflow |
| Audit module (create, search, hash) | Audit logs with SHA-256 hashes |
| Secrets module (metadata only) | Register secret metadata |
| WebSocket gateway for real-time events | Dashboard receives live updates |
| Dashboard: approvals + audit pages | Full approval flow in UI |

**Test:** Evaluate → approval created → approve in dashboard → audit entry appears.

---

## Day 5 — Runtime, CLI & VS Code Extension

| Task | Deliverable |
|------|-------------|
| Runtime daemon (`apps/runtime`) | Local interceptor works |
| CLI (`apps/cli`) | `sentinel login`, `init`, `protect`, `session` |
| SDK (`packages/sdk`) | Shared client library |
| VS Code extension | Approval popups work |
| End-to-end local flow | Full demo path works locally |

**Test:** Start session → trigger `.env` read → see approval in VS Code → approve → action proceeds.

---

## Day 6 — Flare Integration & Smart Contracts

| Task | Deliverable |
|------|-------------|
| Write and test Solidity contracts | Contracts pass Hardhat tests |
| Deploy to Flare Testnet | Verified on explorer |
| Flare service in backend | Hashes anchored on-chain |
| Dashboard: Flare tx links + verify | Can verify audit on-chain |
| Pending anchor queue + retry | Resilient to Flare downtime |

**Test:** Create audit → see Flare tx hash → verify hash on explorer.

---

## Day 7 — Polish, Deploy & Demo Prep

| Task | Deliverable |
|------|-------------|
| Deploy backend to Railway/Render | Production API live |
| Deploy dashboard to Vercel | Production UI live |
| Deploy contracts (if not done) | Explorer links ready |
| Landing page / README | Professional first impression |
| Demo script rehearsal (3x) | Smooth 5-minute demo |
| Bug fixes from rehearsal | Stable demo |

**Test:** Full demo on production URLs.

---

## MVP Success Criteria

- [ ] User can register, login, create project
- [ ] AI agent can be registered
- [ ] Runtime intercepts protected file access
- [ ] Policy engine returns correct decision
- [ ] Approval workflow completes end-to-end
- [ ] Audit log generated with hash
- [ ] Hash anchored on Flare Testnet (real tx)
- [ ] Dashboard shows live activity
- [ ] VS Code extension shows approval popup
- [ ] 5-minute demo runs without errors

---

## Stretch Goals (if time permits)

- Default policy templates on project creation
- `sentinel doctor` health check command
- Audit export as JSON
- Policy version history UI
- Risk score display on approvals

---

## Implementation Order (matches ARCHITECTURE.md)

1. Repository structure
2. Package management (pnpm + turbo)
3. Environment configuration
4. Docker
5. MongoDB connection
6. Authentication
7. Organizations
8. Projects
9. AI Agents
10. Policies
11. Runtime
12. Secret Broker
13. Audit Service
14. Dashboard
15. VS Code Extension
16. CLI
17. Solidity Smart Contracts
18. Flare Integration
19. End-to-end testing
20. Deployment

---

## What We Are NOT Building This Week

- Microservices split
- Redis caching
- OAuth/SSO
- Analytics dashboards
- Slack/Discord integration
- Kubernetes/Terraform
- Multi-organization admin
- Mobile app
- Compliance reports
