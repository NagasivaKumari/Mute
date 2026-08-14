# Sentinel Policy Mesh

### Don't trust the AI. Trust the chain.

Sentinel intercepts every AI coding agent action before it executes, evaluates it against your organization's policies, requires human approval for sensitive operations, and anchors cryptographic proofs on **Flare Testnet**.

**AI agents are powerful. They also have root access to your secrets, your files, and your production infrastructure.** Sentinel puts a policy firewall between the AI and your system — with immutable on-chain audit trails.

---

## The Problem

AI coding agents like Cursor, Claude Code, and Copilot can read your `.env` files, execute shell commands, push to production, and access API keys. OS permissions were designed for humans, not autonomous software. Organizations need:

- **Runtime authorization** — every AI action evaluated against policy before execution
- **Secret protection** — AI agents never receive plaintext secrets
- **Human-in-the-loop approval** — approve or reject high-risk actions in real-time
- **Immutable audit trail** — cryptographically verifiable, anchored on-chain

## The Solution

```
AI Agent → Runtime Firewall → Policy Engine → Decision → Approval → Audit → Flare
```

Every AI request flows through Sentinel's runtime firewall. The policy engine evaluates the action, the risk score determines whether approval is required, and every decision is recorded with a SHA-256 hash anchored on Flare Testnet.

**If Flare were removed, Sentinel would lose its trust layer.** Without on-chain anchoring, audit trails could be tampered with, policy versions could be silently modified, and approval decisions could be denied. Flare makes the entire system verifiable and tamper-evident.

---

## Why Flare

Sentinel uses Flare Testnet as an **immutable trust anchor** — not a database replacement. Five smart contracts provide:

| Contract | What It Proves |
|----------|---------------|
| `OrganizationRegistry` | Organization identity is on-chain and verifiable |
| `PolicyRegistry` | Policy version hashes are immutable — no silent policy changes |
| `ApprovalRegistry` | Every approval decision has a cryptographic proof |
| `AuditRegistry` | Audit log hashes anchor on-chain — tampering detected instantly |
| `AttestationRegistry` | Runtime integrity proofs for binary attestation |

**Never on-chain:** secrets, passwords, API keys, source code, or policy JSON plaintext.

### Verification Flow

1. Every policy publish, approval, and audit event produces a SHA-256 hash
2. Hash is submitted to the corresponding Flare contract via `ethers.js`
3. Transaction receipt stored in MongoDB with Flare explorer link
4. Dashboard "Verify" button recomputes the hash locally and checks against on-chain record
5. **Hash mismatch = tampering detected**

---

## Key Innovation: Secret Reference Manager

Instead of exposing plaintext secrets to AI agents:

```
# Before Sentinel (dangerous)
OPENAI_API_KEY=<placeholder>

# After Sentinel (safe)
OPENAI_API_KEY=sentinel://secret/openai
```

The AI agent sees only `sentinel://` references. Resolution happens through the full pipeline:

```
Secret Request → Policy Engine → Approval → Audit → Flare Attestation → Local Vault Resolution
```

- Plaintext values live in an **encrypted local vault** (`~/.sentinel/vault.enc`) — never on the backend
- Every secret access is audited and attested on Flare Testnet
- The AI agent **never** receives decrypted values
- Temporary runtime tokens expire in 5 minutes

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Developer Machine               │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Dashboard │  │ VS Code   │  │     CLI      │  │
│  │ (Next.js) │  │ Extension │  │  (commander) │  │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘  │
│        └───────────────┼───────────────┘          │
│                        │ REST + WebSocket         │
│                 ┌──────▼──────┐                   │
│                 │   Backend   │ ← NestJS           │
│                 │  (Railway)  │                    │
│                 └──────┬──────┘                   │
│          ┌─────────────┼─────────────┐            │
│   ┌──────▼──────┐ ┌────▼────┐ ┌──────▼──────┐    │
│   │  MongoDB    │ │ Runtime │ │ Flare       │    │
│   │  Atlas      │ │ (local) │ │ Testnet     │    │
│   └─────────────┘ └─────────┘ └─────────────┘    │
│                                                   │
│   ┌─────────────────────────────────────────┐     │
│   │  Runtime Daemon (Node.js)               │     │
│   │  ├── Runtime Firewall                    │     │
│   │  ├── Policy Client → POST /evaluate      │     │
│   │  ├── Secret Broker → vaultGet()          │     │
│   │  ├── Approval Manager → WebSocket        │     │
│   │  └── Audit Client → POST /audit          │     │
│   └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui |
| Backend | NestJS, TypeScript, REST API |
| Database | MongoDB Atlas, Mongoose |
| Runtime | TypeScript, Node.js daemon |
| Blockchain | Flare Testnet (Coston2), Solidity, ethers.js |
| Auth | JWT + API Keys |

---

## Demo Flow

```
1. Register → create org + account
2. Create project "my-app"
3. Run: sentinel init → sentinel protect
   → .env secrets replaced with sentinel:// references
4. Start session: sentinel session start
5. AI agent triggers READ_FILE .env
   → Runtime intercepts → Policy engine: approval_required
6. Approval popup in VS Code + dashboard
7. Approve → audit record created → hash anchored on Flare
8. Verify on Flare Testnet explorer → proof confirmed
```

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Start local MongoDB
docker compose up -d

# Deploy contracts to Flare Testnet
cd contracts
npx hardhat run scripts/deploy.ts --network flareTestnet

# Copy contract addresses to .env
cp ../.env.example ../.env
# Edit .env with deployed addresses

# Start backend
pnpm --filter @sentinel/backend dev

# Start dashboard
pnpm --filter @sentinel/dashboard dev

# Login and initialize
npx sentinel login
npx sentinel init
npx sentinel protect
npx sentinel session start

# Start runtime daemon
pnpm --filter @sentinel/runtime dev
```

---

## Repository Structure

```
sentinel/
├── apps/
│   ├── dashboard/          # Next.js admin UI
│   ├── runtime/            # Local enforcement daemon
│   ├── vscode-extension/   # VS Code integration
│   └── cli/                # Developer CLI
├── backend/                # NestJS API
├── packages/
│   ├── sdk/                # @sentinel/sdk
│   ├── shared/             # Utilities + secret references
│   ├── types/              # Shared TypeScript types
│   └── ui/                 # Shared React components
├── contracts/              # Solidity smart contracts (5 contracts)
├── docker/                 # Local dev environment
└── docs/                   # Architecture documentation
```

---

## What Makes This a Real Product

- **Production-quality code** — no placeholders, no mocks (Flare integration uses real ethers.js transactions)
- **Fail-secure defaults** — backend offline = deny all actions; Flare offline = queue mode continues evaluation
- **Encrypted local vault** — AES-256-GCM encryption for secret values, never exposed to backend
- **Real-time updates** — WebSocket-powered live activity feed, approval popups in VS Code
- **On-chain verification** — every audit entry can be verified against Flare Testnet with one click
- **End-to-end secret protection** — from .env scanning through vault encryption to runtime resolution

---

## Roadmap

- [ ] Flare Confidential Compute for policy evaluation
- [ ] Multi-environment support (staging, production)
- [ ] Policy version history UI
- [ ] Audit export as JSON/PDF
- [ ] Risk score visualization
- [ ] Slack/Discord approval notifications

---

## License

MIT
