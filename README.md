
````md
# Mute — AI Security Gateway

Mute is an AI Security Gateway designed to protect developer secrets, sensitive files, commands, and high-risk operations when working with autonomous AI coding assistants.

AI coding tools can access files, environment variables, terminals, databases, APIs, and infrastructure. This creates a security problem: an AI agent may accidentally expose secrets through prompt injection, unsafe tool usage, or unauthorized commands.

Mute sits between AI agents and protected developer resources and applies security policies before sensitive operations are allowed.

The goal is simple:

> Allow developers to use AI coding agents without giving those agents unrestricted access to secrets and critical infrastructure.

---

## Problem

Modern AI coding assistants such as Cursor, Claude Code, Codex CLI, Gemini CLI, GitHub Copilot, Windsurf, Cline, OpenCode, and MCP-compatible agents can interact with developer environments.

These agents may request access to:

- `.env` files
- API keys
- Database credentials
- SSH keys
- Firebase service accounts
- Kubernetes configuration
- Docker secrets
- Shell commands
- Git operations
- APIs
- Databases
- Deployment infrastructure

Without an enforcement layer, sensitive information may be returned directly to the AI agent.

For example, if an AI agent requests:

```text
.env
````

The real file may contain:

```env
PORT=3001
JWT_SECRET=my-super-secret-key
OPENAI_API_KEY=sk-demo-key
DATABASE_URL=postgresql://user:password@host/database
```

Mute evaluates the request and can return a sanitized version instead:

```env
PORT=3001
JWT_SECRET=<MASKED>
OPENAI_API_KEY=<MASKED>
DATABASE_URL=<MASKED>
```

The original secret file remains unchanged.

---

# How Mute Works

Mute acts as a security layer between an AI agent and developer resources.

```text
AI Coding Agent
       │
       ▼
┌───────────────────┐
│       MUTE        │
│ AI Security Layer │
└───────────────────┘
       │
       ▼
Policy Evaluation
       │
       ├── ALLOW
       ├── MASK
       ├── DENY
       ├── REQUIRE_APPROVAL
       └── READ_ONLY
       │
       ▼
Controlled Resource Access
```

Before an operation is executed, Mute evaluates the request against security policies.

Depending on the policy, the action may be allowed, masked, blocked, restricted, or paused for human approval.

---

# Core Features

## Secret Masking

Mute detects sensitive values inside files such as:

* `.env`
* `.env.local`
* `.env.production`
* AWS credentials
* Azure credentials
* OpenAI API keys
* Firebase credentials
* Database URLs
* SSH private keys
* Kubernetes configuration
* Docker secrets

Sensitive values can be replaced in the AI-facing response with:

```text
<MASKED>
```

or:

```text
<HIDDEN_BY_SENTINEL>
```

The original file is not modified during masking.

---

## Local Secret Protection

Mute also includes a local encrypted vault for protected secrets.

Secrets can be stored in:

```text
~/.sentinel/vault.enc
```

The vault uses AES-256-GCM encryption and is bound to a local machine key.

The machine key is stored locally at:

```text
~/.sentinel/machine.key
```

The local machine key and organization-specific data are used in the vault key derivation process.

---

## Controlled Runtime Execution

Mute supports controlled runtime execution.

The CLI can resolve protected values into the application process environment while preventing those values from being directly returned in the AI-facing context.

Example:

```bash
sentinel run "node app.js"
```

This allows an application to use required credentials during execution while keeping secret handling under the Sentinel runtime flow.

---

# Policy Engine

Mute uses deterministic security policies.

Supported decisions include:

| Policy             | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `ALLOW`            | Allow the operation                                |
| `MASK`             | Return a sanitized version of sensitive data       |
| `DENY`             | Block the operation                                |
| `REQUIRE_APPROVAL` | Pause until an authorized user approves or rejects |
| `READ_ONLY`        | Restrict modification operations                   |

Policies can be applied based on factors such as:

* Organization
* Repository
* Project
* File path
* File type
* AI agent
* Command type
* Tool type
* Risk classification

Example protected resources include:

```text
.env
.env.local
credentials.json
~/.ssh
kubeconfig
Production credentials
```

Safe resources can include:

```text
README.md
package.json
src/
documentation/
```

---

# Human Approval Workflow

Some operations are considered high risk.

Examples include:

* Production deployment
* Database migrations
* Destructive database commands
* Infrastructure changes
* Protected Git operations
* Sensitive network actions

When such an action requires approval, the runtime does not immediately execute it.

Instead:

```text
AI Agent
   │
   ▼
Requests High-Risk Action
   │
   ▼
Mute Policy Engine
   │
   ▼
REQUIRE_APPROVAL
   │
   ▼
Approval Request Created
   │
   ▼
Authorized User
   │
   ├── Approve
   └── Reject
```

Approval decisions are recorded in the audit system and integrated with Flare attestation.

---

# Runtime Enforcement

The runtime layer is responsible for evaluating and controlling sensitive operations.

The architecture includes:

```text
apps/runtime/
```

The runtime processes capability requests and evaluates them through the policy engine.

Supported capability categories include operations related to:

* Files
* Environment variables
* Commands
* Databases
* Network access
* Tool invocation

The goal is to make Mute an enforcement layer rather than only a monitoring system.

---

# Flare Integration

Mute integrates with the Flare ecosystem for confidential compute and tamper-evident event verification.

Flare is not used as the primary application database.

Sensitive event data remains off-chain.

Instead, Mute creates cryptographic attestations for important security events.

The general process is:

```text
Security Event
      │
      ▼
Canonical Event Data
      │
      ▼
SHA-256 Hash
      │
      ▼
Store Full Event Off-Chain
      │
      ▼
Anchor Event Hash on Flare Coston2
```

This provides a tamper-evident verification mechanism without placing secrets or complete audit data on-chain.

---

# Flare Confidential Compute

Mute includes a Flare Confidential Compute integration.

The confidential compute extension is located at:

```text
apps/fce-sentinel/
```

The implementation includes a Go-based confidential compute component and authorization flows used for sensitive operations.

TEE-related authorization data is represented through signed authorization payloads.

The architecture separates:

* AI-facing requests
* Policy decisions
* Sensitive authorization
* Confidential compute authorization
* Runtime execution

---

# Tamper-Evident Audit Trail

Security events are recorded in the backend audit system.

Important events can include:

* File access
* Secret masking
* Policy evaluation
* Blocked commands
* Approval requests
* Approval decisions
* High-risk actions
* Deployment approvals
* Verification events

For applicable events:

1. The event data is serialized.
2. A SHA-256 hash is generated.
3. The full event remains off-chain.
4. The hash is anchored through the Flare integration.
5. The event can later be verified by recomputing the hash and comparing it with the recorded on-chain value.

Example:

```text
Original Event
      │
      ▼
SHA-256
      │
      ▼
Local Hash
      │
      ▼
Flare Record
      │
      ▼
Hash Comparison
      │
      ├── Match → Integrity Verified
      └── Different → Event Changed
```

---

# Smart Contracts

Mute includes Solidity contracts deployed on Flare Coston2.

## Network

```text
Flare Coston2 Testnet
Chain ID: 114
```

RPC:

```text
https://coston2-api.flare.network/ext/C/rpc
```

Explorer:

```text
https://coston2-explorer.flare.network/
```

## Deployed Contracts

### OrganizationRegistry

```text
0xdCcc5Ce7ba7A1159beb562216EF24143157F3BB2
```

### PolicyRegistry

```text
0x58D84000e3Ff33616B06041272938d538E9752B7
```

### ApprovalRegistry

```text
0x8b8f53Cd69a375478AfECAdf4b46A1132A4c8271
```

### AuditRegistry

```text
0x22d41459a7Bf40758FfFCb163D88abDBb1037368
```

### AttestationRegistry

```text
0x4bebFe5D29D046AD29Ba27ECd757CAfc09620A60
```

### FCC / TEE Extension Registry

```text
0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE
```

The contract source files are located in:

```text
contracts/contracts/
```

Including:

```text
OrganizationRegistry.sol
PolicyRegistry.sol
ApprovalRegistry.sol
AuditRegistry.sol
AttestationRegistry.sol
SentinelInstructionSender.sol
```

---

# Architecture

```text
┌──────────────────────────────────────────────────────┐
│                  AI CODING AGENTS                    │
│                                                      │
│ Cursor • Claude Code • Codex • Gemini CLI            │
│ GitHub Copilot • Windsurf • Cline • OpenCode         │
│ MCP-Compatible Agents                                │
└───────────────────────────┬──────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│                    MUTE CLI                          │
│                                                      │
│ sentinel init                                        │
│ sentinel mask-view                                   │
│ sentinel protect                                     │
│ sentinel run                                         │
│ sentinel status                                      │
└───────────────────────────┬──────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│                 RUNTIME ENFORCEMENT                  │
│                                                      │
│ File Access                                          │
│ Environment Access                                   │
│ Command Execution                                    │
│ Database Operations                                  │
│ Network Requests                                     │
│ Tool / Capability Requests                           │
└───────────────────────────┬──────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────┐
│                   POLICY ENGINE                      │
│                                                      │
│ ALLOW │ MASK │ DENY │ REQUIRE_APPROVAL │ READ_ONLY   │
└───────────────┬───────────────────────┬──────────────┘
                │                       │
                ▼                       ▼
       ┌────────────────┐      ┌──────────────────────┐
       │ Secret Handling │      │ Human Approval Flow  │
       │                │      │                      │
       │ Mask AI View   │      │ Pending Request      │
       │ Local Vault    │      │ Approve / Reject     │
       │ Runtime Access │      │                      │
       └────────┬───────┘      └──────────┬───────────┘
                │                         │
                └────────────┬────────────┘
                             ▼
              ┌──────────────────────────┐
              │   SECURITY AUDIT SYSTEM  │
              │                          │
              │ SHA-256 Event Hashing    │
              │ Audit Records            │
              └────────────┬─────────────┘
                           │
                           ▼
              ┌──────────────────────────┐
              │     FLARE INTEGRATION    │
              │                          │
              │ Flare Confidential       │
              │ Compute / TEE             │
              │                          │
              │ Coston2 Attestations      │
              │ Policy / Approval / Audit │
              │ Hash Verification         │
              └──────────────────────────┘
```

---

# Project Structure

```text
Mute/
│
├── apps/
│   │
│   ├── dashboard/
│   │   └── Next.js dashboard
│   │       Policies
│   │       Approvals
│   │       Audit
│   │       Verification
│   │
│   ├── runtime/
│   │   └── Security enforcement runtime
│   │
│   ├── cli/
│   │   └── Sentinel command-line interface
│   │
│   ├── fce-sentinel/
│   │   └── Flare Confidential Compute extension
│   │
│   └── mcp-server/
│       └── MCP integration layer
│
├── backend/
│   └── src/
│       ├── auth/
│       ├── policies/
│       ├── approvals/
│       ├── audit/
│       ├── secrets/
│       ├── flare/
│       ├── fce/
│       ├── runtime-module/
│       └── organization-wallet/
│
├── contracts/
│   └── contracts/
│       ├── OrganizationRegistry.sol
│       ├── PolicyRegistry.sol
│       ├── ApprovalRegistry.sol
│       ├── AuditRegistry.sol
│       ├── AttestationRegistry.sol
│       └── SentinelInstructionSender.sol
│
└── packages/
    ├── shared/
    ├── sdk/
    ├── types/
    └── ui/
```

---

# Dashboard

The web dashboard provides visibility into the security system.

Available areas include:

* Policies
* Approval requests
* Audit events
* Secret-related events
* Organization verification
* Flare verification status
* Wallet connection and trust status
* Recent activity

The dashboard is implemented in:

```text
apps/dashboard/
```

---

# Authentication and Organization Identity

Mute uses application authentication for its primary backend access control.

Wallet connection is supported as an additional organization identity and blockchain trust mechanism.

The wallet flow includes:

1. Connect wallet.
2. Generate a challenge.
3. Sign the challenge.
4. Verify the signature.
5. Associate the verified wallet with the organization.
6. Use the wallet identity for applicable Flare-related verification and ownership records.

The application does not depend exclusively on wallet authentication for normal product access.

---

# CLI

The Sentinel CLI is located at:

```text
apps/cli/
```

Examples include:

```bash
sentinel init
```

Used to initialize Sentinel configuration.

```bash
sentinel mask-view
```

Used to generate a sanitized AI-safe view of protected environment data.

```bash
sentinel protect
```

Used to protect detected secrets using the Sentinel secret storage flow.

```bash
sentinel vault-list
```

Used to inspect protected vault entries.

```bash
sentinel run "<command>"
```

Used to execute a command through the Sentinel-controlled runtime flow.

```bash
sentinel status
```

Used to check Sentinel service status.

```bash
sentinel doctor
```

Used for environment and connectivity diagnostics.

---

# Example Security Flow

An AI agent requests access to:

```text
.env
```

The file contains:

```env
PORT=3001
JWT_SECRET=my-secret
OPENAI_API_KEY=sk-example
DATABASE_URL=postgresql://user:password@host/db
```

Mute evaluates the request.

The policy decision is:

```text
MASK
```

The AI-facing result becomes:

```env
PORT=3001
JWT_SECRET=<MASKED>
OPENAI_API_KEY=<MASKED>
DATABASE_URL=<MASKED>
```

An audit event is created:

```text
Action: READ_FILE
File: .env
Sensitive Entries Found: 3
Masking Applied: YES
Secrets Exposed: 0
```

The relevant event can then participate in the tamper-evident audit and verification flow.

---

# Technology Stack

| Layer                          | Technology                         |
| ------------------------------ | ---------------------------------- |
| Dashboard                      | Next.js                            |
| Backend                        | NestJS                             |
| Runtime                        | Node.js / TypeScript               |
| CLI                            | Node.js / TypeScript               |
| Confidential Compute Extension | Go                                 |
| Smart Contracts                | Solidity                           |
| Blockchain                     | Flare Coston2                      |
| Encryption                     | AES-256-GCM                        |
| Hashing                        | SHA-256                            |
| Authorization Signatures       | Ed25519                            |
| Wallet Verification            | EIP-191 / ethers                   |
| MCP                            | Model Context Protocol integration |

---

# Deployment

Backend health endpoint:

https://mute-yt4b.onrender.com/v1/health

Flare network:

```text
Coston2 Testnet
Chain ID: 114
```

---

# Hackathon

**Flare Summer Signal**

Selected track:

```text
Bounty 2 — Confidential Compute Apps
```

Mute uses Flare Confidential Compute and Flare Coston2 as part of its confidential authorization and tamper-evident attestation architecture.

---

# Target Users

Mute is designed for:

* Individual developers using AI coding agents
* AI engineers
* DevSecOps teams
* Engineering teams
* Organizations building autonomous AI workflows
* Developers working with sensitive infrastructure and credentials

---

# Future Direction

Potential future improvements include:

* Native IDE integrations
* Expanded MCP integrations
* Additional AI agent adapters
* More sandbox and isolation mechanisms
* Physical hardware key support
* WebAuthn integration
* Multi-party approval workflows
* Expanded confidential compute verification
* Flare Mainnet deployment
* Enterprise SSO
* Organization-level security controls

---

# Vision

AI coding assistants are becoming increasingly capable of reading files, executing commands, modifying infrastructure, and interacting with developer environments.

Giving an AI agent unrestricted access to those resources creates a new security boundary that traditional application security tools were not designed to handle.

Mute aims to become a security control layer for that boundary.

Instead of trusting every AI agent request, Mute evaluates the request, applies security policy, masks sensitive information where necessary, blocks prohibited operations, requests human approval for high-risk actions, and creates a verifiable security trail.

```text
AI Agent

      ↓

Mute Security Layer

      ↓

Policy Enforcement

      ↓

Controlled Access

      ↓

Developer Resources
```

The objective is to make AI-assisted development more useful without requiring developers to expose every secret and infrastructure capability directly to autonomous agents.

---

```
```
