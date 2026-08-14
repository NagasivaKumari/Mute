# Security & Threat Model

**Version:** 2.0  
**Status:** Locked

---

## Security Objectives

Sentinel MUST:

- Prevent unauthorized AI actions
- Prevent accidental secret exposure
- Maintain tamper-evident audit history
- Ensure policy integrity via on-chain hashes
- Protect approval workflows
- Fail secure when components are unavailable

---

## Trust Boundaries

```
┌─────────────────┐
│ Developer Machine│  Boundary 1
│  ┌─────────────┐│
│  │   Runtime   ││  Boundary 2
│  └──────┬──────┘│
└─────────┼────────┘
          │ HTTPS
┌─────────▼────────┐
│  Backend (NestJS)│  Boundary 3
└─────────┬────────┘
          │
┌─────────▼────────┐
│  MongoDB Atlas   │  Boundary 4
└──────────────────┘

┌──────────────────┐
│  Flare Testnet   │  Boundary 5
└──────────────────┘
```

Everything crossing a boundary requires authentication.

---

## Threat Actors

| Actor | Goal | Mitigation |
|-------|------|------------|
| Malicious AI agent | Read secrets, delete files | Runtime firewall, policy engine, capabilities |
| Compromised VS Code ext | Steal tokens, bypass runtime | API key scoping, runtime fail-secure |
| Malicious insider | Disable policies, delete audits | RBAC, audit immutability, Flare hashes |
| External attacker | Credential theft, API abuse | JWT expiry, rate limiting, bcrypt |
| Local malware | Steal secrets from vault | Encrypted local vault, no plaintext in backend |

---

## Attack Surface

| Surface | Risk | Controls |
|---------|------|----------|
| REST API | High | JWT, input validation, org scoping |
| WebSocket | Medium | JWT on connect, event scoping |
| Runtime (local) | High | Fail-secure, encrypted vault |
| CLI | Medium | API key storage in `~/.sentinel/` |
| Smart contracts | Medium | Access control, input validation |
| Dashboard | Medium | Auth middleware, CSP headers |

---

## Key Mitigations

### Secret Protection (Secret Reference Manager)

- Plaintext secrets never in MongoDB, API responses, or on-chain
- Environment variables use `sentinel://secret/{name}` references
- AI agents receive references only — never decrypted values
- Local encrypted vault on developer machine holds plaintext
- Runtime resolves references after policy + approval + audit
- Temporary runtime tokens expire in 5 minutes
- Every secret access audited and attested on Flare Testnet

### Policy Integrity

- SHA-256 hash of canonical policy JSON
- Hash anchored on Flare Testnet
- Version history in MongoDB
- Verification endpoint compares local vs on-chain

### Audit Immutability

- Audit records are append-only (no DELETE endpoint)
- Each entry has SHA-256 hash
- Hash anchored on Flare asynchronously
- Hash mismatch = tampering detected

### Authentication

- Passwords: bcrypt (cost 12)
- JWT access token: 15 min expiry
- Refresh token: 7 days, stored hashed
- API keys: random 32-byte, bcrypt hash stored

### Fail-Secure Defaults

| Component down | Behavior |
|----------------|----------|
| Backend offline | Runtime denies all actions |
| Flare offline | Continue evaluation, queue anchors |
| MongoDB offline | API returns 503, runtime denies |
| Secret vault unavailable | Deny secret access |

---

## RBAC (MVP)

| Role | Permissions |
|------|-------------|
| owner | Full access, delete org |
| admin | Manage projects, policies, agents, approve |
| member | View dashboard, create sessions, approve own requests |

---

## Out of Scope

- Physical attacks
- Nation-state adversaries
- Compromised hardware
- Quantum-resistant cryptography

---

## Security Checklist (Pre-Demo)

- [ ] No secrets in git repository
- [ ] `.env` in `.gitignore`
- [ ] JWT secret is strong random value
- [ ] MongoDB connection uses TLS
- [ ] CORS configured for dashboard domain only
- [ ] Rate limiting enabled on auth endpoints
- [ ] No plaintext secrets in logs
- [ ] Smart contract access control tested
