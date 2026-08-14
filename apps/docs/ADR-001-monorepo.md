# ADR-001: Monorepo Architecture

**Status:** Accepted  
**Date:** 2026-07-28

---

## Context

Sentinel includes a dashboard, backend API, runtime daemon, CLI, VS Code extension, SDK, and smart contracts. Separate repositories would cause version mismatches and duplicated types.

---

## Decision

Use a **pnpm workspace monorepo** with Turborepo for build orchestration.

### Structure

- `apps/` — user-facing applications (dashboard, runtime, cli, vscode-extension)
- `backend/` — single NestJS application (not microservices)
- `packages/` — shared libraries (sdk, types, shared, ui)
- `contracts/` — Solidity smart contracts

### Key Choices

| Choice | Decision | Rationale |
|--------|----------|-----------|
| Package manager | pnpm | Fast, strict, workspace support |
| Build system | Turborepo | Parallel builds, caching |
| Backend | Single NestJS app | Faster hackathon delivery |
| Database | MongoDB + Mongoose | Flexible JSON for policies |
| Runtime | TypeScript/Node.js | Same language as backend |
| Hosting | Vercel + Railway | Zero-config deployment |

### Rejected

- Microservices (too slow for 7-day sprint)
- PostgreSQL + Prisma (MongoDB better for policy JSON)
- Redis (not needed for MVP)
- Rust runtime (TypeScript sufficient)
- Kubernetes/Terraform (single-service deployment)

---

## Consequences

**Positive:** Shared types, single dependency graph, fast iteration, one repo to clone.

**Negative:** Larger repo, requires workspace discipline, longer CI if not cached.

---

## References

- [ARCHITECTURE.md](./ARCHITECTURE.md) — locked MVP architecture
