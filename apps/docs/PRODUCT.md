# PRD — Product Requirements (Hackathon MVP)

**Version:** 2.0  
**Status:** Approved  
**Hackathon:** Flare Summer Signal 2026

---

## Executive Summary

Sentinel Policy Mesh (SPM) is a policy enforcement platform for autonomous AI agents. It intercepts every AI action before execution, evaluates it against organization policies, requires human approval when needed, and records cryptographically verifiable audit proofs on Flare Testnet.

**Tagline:** Don't trust the AI. Trust Sentinel.

---

## Problem

AI coding agents (Cursor, Claude Code, Copilot, etc.) receive broad filesystem, network, and secret access. Current OS permissions were designed for humans, not autonomous software. Organizations need:

- Runtime AI authorization
- Secret protection without direct exposure
- Human approval workflows
- Immutable audit trails

---

## Solution

Every AI request flows through Sentinel Runtime before execution:

```
AI Agent → Runtime Firewall → Policy Engine → Decision → Audit → Flare
```

Decisions: **Allow** | **Deny** | **Require Approval**

---

## Target Users (MVP)

- Enterprise developers using AI coding tools
- DevOps / platform engineers
- Security-conscious teams at the hackathon demo

---

## MVP Features

| Feature | Description |
|---------|-------------|
| Dashboard | Org overview, live activity, pending approvals |
| Policy Engine | Rule-based evaluation (IF action + resource THEN decision) |
| Runtime Firewall | Intercept file, shell, git, secret, network actions |
| AI Agent Registry | Register and track agents per project |
| Approval Center | Approve/reject pending requests |
| Audit Explorer | Searchable action log with Flare tx links |
| Secret Broker | Metadata only; temporary scoped access tokens |
| Flare Integration | Anchor policy/audit/approval hashes on Testnet |
| VS Code Extension | Approval popups, session status |
| CLI | `login`, `init`, `protect`, `session`, `audit` |

### Not in MVP

Multi-chain, mobile app, SSO, billing, marketplace, analytics dashboards, policy simulator, Slack/Discord notifications, compliance reports.

---

## Core Use Cases

### UC-1: Block `.env` read

AI requests read `.env` → policy triggers approval → user approves once → temporary access granted → audit recorded on Flare.

### UC-2: Block dangerous commands

AI runs `rm -rf /` → policy auto-denies → audit recorded.

### UC-3: Git push with secrets

AI pushes repo → runtime scans for secrets → push blocked if detected.

### UC-4: Production deploy approval

AI requests deploy to production → manager approval required → proceeds after approval.

---

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Register organization and user |
| FR-002 | Register AI agent per project |
| FR-003 | Issue API keys for runtime/CLI |
| FR-004 | Create and publish policies |
| FR-005 | Evaluate runtime requests |
| FR-006 | Create and resolve approvals |
| FR-007 | Generate audit logs |
| FR-008 | Anchor decision hashes on Flare |
| FR-009 | Register secret metadata (no plaintext storage) |
| FR-010 | Display activity in dashboard |

---

## Non-Functional Requirements (MVP Realistic)

| Requirement | Target |
|-------------|--------|
| Policy decision latency | < 500ms (local + API) |
| Availability | Best effort (single deployment) |
| Encryption at rest | MongoDB Atlas encryption |
| Encryption in transit | TLS 1.3 |
| Password hashing | bcrypt |
| JWT signing | HS256 |
| Logging | Structured JSON to stdout |

---

## Success Metrics (Demo)

- Runtime intercepts protected file access
- Policy engine returns correct decisions
- Approval workflow completes end-to-end
- Audit hash visible on Flare Testnet explorer
- Dashboard updates with live activity

---

## Demo Script

1. Register and log in
2. Create project "my-app"
3. Run `sentinel init` and `sentinel protect`
4. Open VS Code with extension
5. Start session: `sentinel session start`
6. Trigger AI read of `.env`
7. See approval in dashboard + VS Code popup
8. Approve request
9. Show audit entry with Flare transaction link
10. Show policy hash verification on Flare
