# Flare Summer Signal — Submission

## Project name
**Sentinel Policy Mesh** — *Don't trust the AI. Trust the chain.*

## Selected bounty
**Bounty 2 — Confidential Compute Apps**

## Short product description
Sentinel Policy Mesh is a **policy firewall for AI coding agents**. AI agents (Cursor, Claude Code, Copilot) have root-level access to an organization's `.env` files, API keys, source code, and production infrastructure. Sentinel intercepts every agent action before it executes, evaluates it against org policy, requires human approval for high-risk operations, masks secrets before they reach the agent, and anchors a cryptographic proof of every decision on **Flare Coston2**.

The confidential-compute core is a **Flare Confidential Compute extension (`fce-sentinel`)** built on the official Flare `tee-node` stack: it handles policy attestations, secret authorizations, and dangerous-operation approvals and returns **Ed25519-signed** responses that clients verify against the extension's key. The extension implements the complete FCC extension protocol and is E2E-tested against Flare's Coston2 proxy infrastructure; deployment inside a confidential TEE is the registration step that makes "this decision came from inside a TEE" a hardware-provable fact. "Trust the chain, not the chat."

## Target user
Engineering teams and organizations that let autonomous AI agents touch production code, secrets, and infrastructure — and need a verifiable, human-in-the-loop guardrail plus an immutable audit trail for compliance.

## Demo
- **Live demo (CLI):** `node demo/security-demo.mjs` — reads a `.env`, Sentinel detects 7 secrets, masks them as `<HIDDEN_BY_SENTINEL>`, returns the sanitized file to the agent, records an audit entry, and anchors its hash on Coston2 (when the backend has Flare configured).
- **Dashboard demo:** "Security" page → "Run Live Demo" — runs the same pipeline against the API (`POST /v1/demo/run`) and shows the on-chain audit record with a "Verify" button.
- Backend: `http://localhost:3001` (`/v1/health`, `/v1/demo/run`, `/v1/audit`, `/v1/flare/status`).
- Dashboard: `http://localhost:3000` (wallet-only login with Bifrost on Flare/Coston2).

## GitHub / repo
https://github.com/NagasivaKumari/Flare — monorepo: `backend/` (NestJS API), `apps/dashboard/` (Next.js), `apps/runtime/` (enforcement daemon), `apps/cli/`, `apps/vscode-extension/`, `packages/` (SDK/shared), `contracts/` (5 Solidity contracts), `apps/fce-sentinel/` (FCC Go extension), `demo/`.

## How the project uses Flare
Two distinct Flare integrations:

**1. On-chain trust anchor (5 Solidity contracts deployed on Coston2).** Every policy publish, approval, and audit event produces a SHA-256 hash that is submitted via `ethers.js` to a per-purpose registry:

| Contract | What it proves | Address (Coston2) |
|---|---|---|
| `OrganizationRegistry` | Organization identity verifiable on-chain | `0xdCcc5Ce7ba7A1159beb562216EF24143157F3BB2` |
| `PolicyRegistry` | Policy version hashes immutable — no silent policy changes | `0x58D84000e3Ff33616B06041272938d538E9752B7` |
| `ApprovalRegistry` | Every human approval has a cryptographic proof | `0x8b8f53Cd69a375478AfECAdf4b46A1132A4c8271` |
| `AuditRegistry` | Audit log hashes anchored — tampering detected instantly | `0x22d41459a7Bf40758FfFCb163D88abDBb1037368` |
| `AttestationRegistry` | TEE attestation records verifiable on-chain | `0x4bebFe5D29D046AD29Ba27ECd757CAfc09620A60` |

All five are owned by the deployer `0xe3addC...64973` (verified on-chain). The dashboard "Verify" button recomputes the hash locally and checks the on-chain record — a hash mismatch means tampering. **If Flare were removed, Sentinel loses its trust layer.**

**2. Flare Confidential Compute extension (`fce-sentinel`).** A Go extension implementing the FCC extension protocol using the official Flare packages (`go-flare-common/pkg/tee/instruction`, `flare-foundation/tee-node`). It handles four op-commands — `AUTHORIZE_SECRET`, `ATTEST_POLICY`, `AUTHORIZE_DANGEROUS`, `GET_STATE` — and returns **Ed25519-signed** authorization/attestation responses (signature + public key). A `SentinelInstructionSender` contract is deployed on Coston2, **registered as FCC extension ID 66197** in Flare's live `TeeExtensionRegistry`, and wired to Flare's `TeeMachineRegistry`. The backend dispatches instructions on-chain, polls the extension proxy for the signed result, and verifies each response (ed25519, 5-minute expiry, replay protection, key pinning).

**The extension is registered as a PRODUCTION TEE machine on Coston2.** The machine `0x6A6390c60874949Ca318A946308AF47806f65505` was pre-registered, availability-checked by Flare's FTDC proxy (`tee-proxy-coston2-1.flare.rocks`), and promoted to production; it is returned by `getActiveTeeMachines(66197)`. An end-to-end `AUTHORIZE_SECRET` instruction was sent on-chain, routed to the TEE, processed, and returned a valid Ed25519-signed authorization (`authorized: true`) that the backend verifies against the extension's key.

> **Attestation note:** the extension runs on the team's own hardware (no GCP Confidential Space credits were provided), so the tee-proxy operates in Flare's official simulated-attestation mode (`SIMULATED_TEE=true`, `MODE=1`, `/info` returns `magic_pass`). On-chain registration, the instruction flow, and Ed25519 signatures are real on Coston2; only the vTPM attestation quote is simulated. Running the same image in GCP Confidential Space with `LOCAL_MODE=false` produces real hardware attestation with zero code changes.

## What was newly built during the program
- **Full Sentinel Policy Mesh platform**: NestJS backend (auth, orgs, policies, projects, approvals, secrets, audit, Flare anchoring, risk engine, demo endpoints), Next.js dashboard, local enforcement runtime daemon, CLI, VS Code extension, SDK + shared packages.
- **The `fce-sentinel` FCC extension**: a Go worker implementing the FCC extension protocol (four signed op-commands), the `SentinelInstructionSender` contract deployed on Coston2, pre/post-build scripts for Flare's confidential-compute registration flow, and an on-chain E2E test script.
- **The TEE decision path wired into every runtime decision**: `POST /v1/runtime/evaluate` refuses to act on a matched policy unless the extension returns a valid signed `ATTEST_POLICY` response; `resolve-secret` refuses to authorize a secret without `AUTHORIZE_SECRET`; dangerous operations require `AUTHORIZE_DANGEROUS`. The local runtime daemon independently re-verifies each Ed25519 signature and rejects replayed instruction IDs before trusting any decision. If the extension is unreachable, the backend fails secure (503).
- **Live demo pipeline**: `/v1/demo/run` endpoint + `demo/security-demo.mjs` that exercise file scanning, secret masking, and audit anchoring end-to-end.
- **System policy seed set** (`.env` read protection, dangerous shell ops, etc.) seeded on org creation with on-chain anchors.
- **Wallet-only dashboard auth** (Flare/Coston2 chain enforcement via Bifrost).

## What existed before the hackathon
The platform idea predates the hackathon. What did NOT exist before: the on-chain contracts, the FCC extension, the demo pipeline, the wallet integration, and the end-to-end anchoring — all built during the program.

## Flare deployment details
- **Network:** Flare Coston2 (chainId 114).
- **Deployer:** `0xe3addC95959ee11fb29fB4621a5D924d28064973` (verified as `owner()` of all five registries on-chain).
- **Deployed contracts:** the five registries above plus `SentinelInstructionSender` at `0x2480d705eC12455EA707a5fBDcaCB84b8D3A03db` (wired to Flare's live `TeeExtensionRegistry` at `0x1a9C4A0f9D76c0b1D91d22E24E573a9b377618aE`).
- **FCC extension registration:** extension ID **66197** on Flare's live `TeeExtensionRegistry`.
- **TEE machine (PRODUCTION):** `0x6A6390c60874949Ca318A946308AF47806f65505`, owner `0xe3addC...64973`, host URL `https://7c46-2405-201-c033-210f-9980-d53c-2827-eb94.ngrok-free.app` (public tunnel to the extension proxy). Machine state promoted to production after a successful FTDC availability check against Flare's proxy. Host-URL update tx: `0x07cd1446423ce70ecce67dc949b6bbee88bd3caec24e865639a0e88be6a9789b`.
- **E2E proof:** on-chain `AUTHORIZE_SECRET` instruction `0xada7a6dea69bd7e8b6407948661a04790e4793225800a953e9683279a49d1776` processed by the TEE → signed response `{Authorized:true, AuthorizationId:1, PublicKey:302a300506032b6570032100cb25..., Signature:58b2363a...}` (run-test, 2026-08-13).
- **Audit anchoring:** backend anchors audit hashes to `AuditRegistry` via the `/v1/audit` and `/v1/demo/run` flows; the dashboard "Verify" button recomputes and checks each hash on-chain.
- **Explorer:** https://coston2-explorer.flare.network

## Live on-chain anchors (Coston2)
> Verified on-chain via `scripts/seed-onchain.mjs` (2026-08-13). Org, policies, approval, and audits are all verified records on their registries.

- **FCC extension registration:** extensionId **66197** — registered via Flare's `registerExtension` (owners allowed, key type added). TEE machine `0x6A6390c6...` is PRODUCTION and returned by `getActiveTeeMachines(66197)`.
- **Organization `sentinel-demo-org`:** [tx](https://coston2-explorer.flare.network/tx/0x3c3554f964c704c34bb1268ec45edf2368187ae172af0227259d0c9525a3d683)
- **Policy `deny-read-env`:** hash `0x2a3bac55a87601fa10c98c2850fea4f7fedfea9f3d13c5c0e0c8c517b0877c3a` — [tx](https://coston2-explorer.flare.network/tx/0xe1fe5aa59a3af5f64cd18f7344e9d6c827c11ce3afc493e50f768f410c36bdca)
- **Policy `approve-secret-access`:** hash `0x58547157ad679d77678d79ac57a0f6814cd4e091c612cdc60d621bb550ce0eb0` — [tx](https://coston2-explorer.flare.network/tx/0x8d8a64123966a9f30024e3d602ad25eeca3ce0e14d6fdd34e40db83af0786c86)
- **Approval `demo-approval-resolve-secret`:** [tx](https://coston2-explorer.flare.network/tx/0x802754630a9b57b0e52e256bab55c9b8b851111a230718bf090d3c543f08b09b)
- **Audit `FILE_READ`:** hash `0xec0e33a9a2bffde2135a35c29f3fc18428fcb8392a5c63b26d48f0fa2b567c65` — [tx](https://coston2-explorer.flare.network/tx/0xa1ec86f9d4c9aa1de655f988038ab57d4c4a0ccf3046d238c1aca72769067029)
- **Audit `RESOLVE_SECRET`:** hash `0x2482c07d73abbcab74eac2675c464d07c65c7b735614ffcf4ffb8c5c0f34435b` — [tx](https://coston2-explorer.flare.network/tx/0xc3300cf2972d4173e4ae57bffad4f8e562d0ca3283d0b3f36d3a0f5da0f19b3e)
- **Audit `DEPLOY_PRODUCTION`:** hash `0xf18445f5740bb216f847ac910b554147beedf997132c31b36a33761fb4a74c85` — [tx](https://coston2-explorer.flare.network/tx/0xcf8dacc9e74d8f5f38a0f51197fde94bde7a362760aee3778801c507afddcae9)

## Roadmap / next steps
1. **Run the extension inside Flare's confidential TEE** — **PARTIAL on Coston2.** Extension 66197 has a registered PRODUCTION TEE machine (`0x6A6390c6...`), and an on-chain `AUTHORIZE_SECRET` instruction was processed by the TEE with a verifiable Ed25519-signed response. The machine runs in simulated-attestation mode (no GCP credits); deploying to GCP Confidential Space with `LOCAL_MODE=false` upgrades it to real hardware attestation.
2. **Go to Flare Mainnet** — migrate the five registries, the instruction sender, and the extension from Coston2 to production.
3. **Ship a public demo** — deploy backend + dashboard to a hosted URL so judges can click through the live demo without installing anything.
4. **Widen the TEE surface** — today the extension attests the *matched policy*, authorizes *secret access*, and signs *dangerous-op approvals*. Next step: run full policy evaluation itself inside the TEE so the matched-rule decision is TEE-computed, not just attested.
5. **Better operations** — policy version history UI, audit export (JSON/PDF), Slack/Discord approval notifications.
6. **Get real users** — run a pilot with 2–3 engineering teams using AI coding agents; publish usage and feedback.

## Bonus notes
- **Deployed on:** Coston2 — five registries + instruction sender (owners verified on-chain).
- **New work evidence:** deployer-owned contracts on-chain, demo runs end-to-end locally, FCC extension 66197 with a registered **PRODUCTION TEE machine** and a successfully processed, Ed25519-signed on-chain `AUTHORIZE_SECRET` instruction.
- **Why it matters:** AI agents now ship code autonomously. Sentinel is the first thing that makes "an agent touched my secrets" a *verifiable statement on-chain* rather than a log line someone can edit.
