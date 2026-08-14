# Flare Integration & Smart Contracts

**Version:** 2.0  
**Status:** Locked  
**Network:** Flare Testnet (Chain ID: 114)

---

## Objective

Flare is the **trust layer** of Sentinel. Critical decisions produce cryptographic proofs anchored on-chain. Users can independently verify policy integrity, approval authenticity, and audit immutability.

Flare is **not** a secret store or database replacement.

---

## What Goes On-Chain

| Data | Contract |
|------|----------|
| Organization identity | OrganizationRegistry |
| Policy version hashes | PolicyRegistry |
| Approval attestations | ApprovalRegistry |
| Audit log hashes | AuditRegistry |

## What Never Goes On-Chain

Secrets, passwords, API keys, `.env` values, source code, policy JSON plaintext, user PII.

---

## Smart Contracts (MVP)

```
contracts/
├── OrganizationRegistry.sol
├── PolicyRegistry.sol
├── ApprovalRegistry.sol
├── AuditRegistry.sol
├── hardhat.config.ts
├── scripts/deploy.ts
└── test/
```

### OrganizationRegistry.sol

```solidity
function registerOrganization(bytes32 orgId, address wallet) external;
function getOrganization(bytes32 orgId) external view returns (Organization memory);
function disableOrganization(bytes32 orgId) external;
```

Stores: org ID hash, admin wallet, created timestamp, active status.

### PolicyRegistry.sol

```solidity
function publishPolicy(bytes32 orgId, bytes32 policyHash, uint256 version) external;
function getLatestVersion(bytes32 orgId, bytes32 policyId) external view returns (uint256);
function verifyPolicy(bytes32 orgId, bytes32 policyId, bytes32 policyHash) external view returns (bool);
```

Stores: org ID, policy ID hash, SHA-256 hash, version number, publisher, timestamp.

### ApprovalRegistry.sol

```solidity
function recordApproval(bytes32 approvalId, bytes32 decisionHash, address approver) external;
function verifyApproval(bytes32 approvalId) external view returns (ApprovalRecord memory);
```

Stores: approval ID, decision hash, approver address, timestamp.

### AuditRegistry.sol

```solidity
function recordAudit(bytes32 auditHash, bytes32 orgId, bytes32 sessionId, uint8 decision) external;
function verifyAudit(bytes32 auditHash) external view returns (bool);
function getAuditCount(bytes32 orgId) external view returns (uint256);
```

Stores: audit hash, org ID, session ID, decision enum, timestamp.

---

## Hash Generation

All hashes use SHA-256 of canonical JSON (sorted keys, no whitespace):

**Policy hash:**

```json
{
  "orgId": "...",
  "policyId": "...",
  "version": 2,
  "rules": [...]
}
```

**Audit hash:**

```json
{
  "orgId": "...",
  "sessionId": "...",
  "action": "READ_FILE",
  "resource": ".env",
  "decision": "approved",
  "timestamp": "2026-07-28T12:00:00Z",
  "policyHash": "..."
}
```

**Approval hash:**

```json
{
  "approvalId": "...",
  "action": "READ_FILE",
  "resource": ".env",
  "status": "approved",
  "resolvedAt": "2026-07-28T12:01:00Z"
}
```

---

## Backend Flare Service

```
backend/src/flare/
├── flare.module.ts
├── flare.service.ts        # ethers.js contract interaction
├── flare.controller.ts     # /flare/* endpoints
└── contracts/              # ABI JSON files
```

Uses `ethers` v6 to interact with deployed contracts.

Flow:

1. Policy published → compute hash → `PolicyRegistry.publishPolicy()` → store tx hash in MongoDB
2. Approval resolved → compute hash → `ApprovalRegistry.recordApproval()` → store tx hash
3. Audit created → compute hash → `AuditRegistry.recordAudit()` → store tx hash (async, non-blocking)

If Flare is unavailable, hashes are queued in MongoDB (`pendingAnchors` collection) and retried.

---

## Deployment

```bash
# Deploy to Flare Testnet
cd contracts
npx hardhat run scripts/deploy.ts --network flareTestnet
```

Environment:

```env
FLARE_RPC_URL=https://coston2-api.flare.network/ext/C/rpc
FLARE_PRIVATE_KEY=0x...
FLARE_CHAIN_ID=114
```

After deployment, store contract addresses in backend env:

```env
ORG_REGISTRY_ADDRESS=0x...
POLICY_REGISTRY_ADDRESS=0x...
APPROVAL_REGISTRY_ADDRESS=0x...
AUDIT_REGISTRY_ADDRESS=0x...
```

---

## Verification Flow

Dashboard "Verify" button on audit entries:

1. Fetch audit record from MongoDB
2. Recompute SHA-256 hash locally
3. Call `AuditRegistry.verifyAudit(hash)` on Flare
4. Display: verified / mismatch (tampering detected)

Link to Flare Testnet explorer for every anchored transaction.

---

## Confidential Compute (FCE extension)

Sentinel implements a **Flare Confidential Compute extension** (`apps/fce-sentinel/`), a Go worker built on the official Flare `tee-node` packages. It implements the FCC extension protocol and returns **Ed25519-signed** attestations:

| Op-command | Purpose | Used by |
|---|---|---|
| `AUTHORIZE_SECRET` | Grants access to a vault secret | `/v1/runtime/resolve-secret` |
| `ATTEST_POLICY` | Attests the matched policy (org, id, version, hash) | `/v1/runtime/evaluate` |
| `AUTHORIZE_DANGEROUS` | Authorizes a high-risk operation | `/v1/runtime/authorize-dangerous` |
| `GET_STATE` | State for monitoring/audit | `/v1/runtime/evaluate` |

### Status (honest)

- **Protocol: complete and correct.** Request/response flows follow the official TEE instruction format (`processorutils.Parse`, `instruction.DataFixed`) from `flare-foundation/tee-node`.
- **On-chain wiring: deployed.** `SentinelInstructionSender` is live on Coston2 at `0xf3cc894f82a3068eAB2818B3Ff051e326D4FCBF0`, wired to Flare's live `TeeExtensionRegistry`/`TeeMachineRegistry`.
- **Local testing: `SIMULATED_TEE=true`.** The extension is E2E-tested against the Coston2 proxy infrastructure in simulation mode (software ed25519 key, no enclave).
- **Not yet done: production TEE registration.** Registering the extension and TEE machine with a real attestation document, and provisioning the signing key inside Flare's confidential TEE. Until then the "decision came from inside a TEE" claim is protocol-level, not hardware-attested. This is roadmap item #1.

### How it fits the decision path

1. Backend sends an instruction through `SentinelInstructionSender` (on-chain, Coston2).
2. The FCE proxy routes it to the extension.
3. The extension signs the response (ed25519, includes a replay-resistant instruction ID).
4. Backend polls the proxy for the result and verifies the signature (`verifyTeeAuth`, `verifyAttestation`, `verifyDangerousAuth`).
5. The runtime daemon independently re-verifies the attestation (ed25519 + replay) before trusting any policy-based decision.

If the extension is unreachable, the backend **fails secure** (`503` — no policy decision or secret access without a signed response).

### Deployment

- `apps/fce-sentinel/docker-compose.yaml` — local run with `SIMULATED_TEE=true`.
- `apps/fce-sentinel/docker-compose.coston2.yaml` — Coston2 network config.
- `apps/fce-sentinel/config/coston2/deployed-addresses.json` — registry + instruction sender addresses.
- `apps/fce-sentinel/scripts/test.sh` — on-chain end-to-end test (instruction → extension → signed result).

---

## Demo Talking Points

1. "Every policy version is hashed and stored immutably on Flare"
2. "Show the Flare explorer — here's our audit proof"
3. "If anyone tampered with our audit log, the hash wouldn't match on-chain"
4. "Secrets never touch the blockchain — only cryptographic proofs"
