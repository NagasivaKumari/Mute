#!/usr/bin/env node
/**
 * Seed real, verifiable on-chain records into the deployed Sentinel
 * registries on Flare Coston2.
 *
 * Usage:
 *   $env:FLARE_PRIVATE_KEY="0x..."   # deployer key (never stored in repo)
 *   $env:ORG_REGISTRY_ADDRESS="0x..."
 *   $env:POLICY_REGISTRY_ADDRESS="0x..."
 *   $env:APPROVAL_REGISTRY_ADDRESS="0x..."
 *   $env:AUDIT_REGISTRY_ADDRESS="0x..."
 *   $env:TEE_MANAGER_ADDRESS="0x..."
 *   $env:INSTRUCTION_SENDER_ADDRESS="0x..."
 *   $env:ORG_ID="sentinel-demo-org"
 *   $env:SESSION_ID="sentinel-demo-session-1"
 *   $env:APPROVER="0x..."
 *   $env:ORG_NAME="Sentinel Policy Mesh Demo"
 *   node scripts/seed-onchain.mjs
 *
 * Prints tx hashes + anchored hashes ready to paste into the submission.
 */
import { createHash } from 'node:crypto';
import { ethers } from 'ethers';

const RPC = process.env.FLARE_RPC_URL ?? 'https://coston2-api.flare.network/ext/C/rpc';
const PRIVATE_KEY = process.env.FLARE_PRIVATE_KEY;

const ADDR = {
  organization: process.env.ORG_REGISTRY_ADDRESS,
  policy: process.env.POLICY_REGISTRY_ADDRESS,
  approval: process.env.APPROVAL_REGISTRY_ADDRESS,
  audit: process.env.AUDIT_REGISTRY_ADDRESS,
  teeDiamond: process.env.TEE_MANAGER_ADDRESS,
  instructionSender: process.env.INSTRUCTION_SENDER_ADDRESS,
  tee: process.env.TEE_MANAGER_ADDRESS,
  sender: process.env.INSTRUCTION_SENDER_ADDRESS,
};

const EXPLORER = 'https://coston2-explorer.flare.network/tx';

function sha256(data) {
  const payload = typeof data === 'string' ? data : canonicalJson(data);
  return createHash('sha256').update(payload).digest('hex');
}
function canonicalJson(obj) {
  return JSON.stringify(sortKeys(obj));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }
  return v;
}

const ORG_ID = process.env.ORG_ID ?? 'sentinel-demo-org';
const SESSION_ID = process.env.SESSION_ID ?? 'sentinel-demo-session-1';
const APPROVER = process.env.APPROVER;
const ORG_NAME = process.env.ORG_NAME ?? 'Sentinel Policy Mesh Demo';

const FRAGS = {
  organization: ['function createOrganization(bytes32,address,string)', 'function getOrganizationByOwner(address) view returns (bytes32)'],
  policy: ['function registerPolicy(bytes32,bytes32,bytes32,uint256)'],
  approval: ['function recordApproval(bytes32,bytes32,address,bool,string)', 'function verifyApproval(bytes32) view returns (bool)'],
  audit: ['function recordAudit(bytes32,bytes32,bytes32,bytes32,bytes32)', 'function verifyAudit(bytes32) view returns (bool)'],
  tee: [
    'function register(address stateVerifierAddress, address instructionsSenderAddress) returns (uint256)',
    'function addAllowedTeeMachineOwners(uint256,address[])',
    'function addAllowedTeeWalletProjectOwners(uint256,address[])',
    'function nextPublicExtensionId() view returns (uint256)',
    'function getTeeExtensionInstructionsSender(uint256) view returns (address)',
  ],
  sender: ['function setExtensionId()', 'function extensionId() view returns (uint256)'],
};

const FIRST_PUBLIC_EXTENSION_ID = 0x10000n;

if (!PRIVATE_KEY) {
  console.error('ERROR: set FLARE_PRIVATE_KEY (deployer key). Refusing to read .env.');
  process.exit(1);
}
if (!ADDR.organization || !ADDR.policy || !ADDR.approval || !ADDR.audit || !ADDR.tee || !ADDR.sender) {
  console.error('ERROR: set all contract addresses via env vars (ORG_REGISTRY_ADDRESS, POLICY_REGISTRY_ADDRESS, APPROVAL_REGISTRY_ADDRESS, AUDIT_REGISTRY_ADDRESS, TEE_MANAGER_ADDRESS, INSTRUCTION_SENDER_ADDRESS)');
  process.exit(1);
}
if (!APPROVER) {
  console.error('ERROR: set APPROVER address via env var');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const contracts = Object.fromEntries(
  Object.keys(FRAGS).map((k) => [k, new ethers.Contract(ADDR[k], FRAGS[k], wallet)]),
);

async function send(label, fn) {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    console.log(`  ${label}: ${receipt.hash}`);
    console.log(`    explorer: ${EXPLORER}/${receipt.hash}`);
    return receipt.hash;
  } catch (err) {
    const msg = err?.reason ?? err?.message ?? String(err);
    if (/AlreadyRegistered|VersionNotNewer|AlreadyRecorded|3a81d6fc|4d763cd9|103b4afe/i.test(msg) || String(err).includes('3a81d6fc')) {
      console.log(`  ${label}: already present, skipping`);
      return null;
    }
    throw err;
  }
}

const toB32 = (s) => ethers.id(s);

async function sendTolerant(label, fn) {
  try {
    const tx = await fn();
    const receipt = await tx.wait();
    console.log(`  ${label}: ${receipt.hash}`);
    console.log(`    explorer: ${EXPLORER}/${receipt.hash}`);
    return receipt.hash;
  } catch (err) {
    const msg = err?.reason ?? err?.message ?? String(err);
    if (/already|already set|not newer|AddressAlreadyInSet|b725c7fb/i.test(msg) || String(err).includes('b725c7fb')) {
      console.log(`  ${label}: skipped (${msg.slice(0, 100)})`);
      return null;
    }
    throw err;
  }
}

async function findExtensionId(tee) {
  const count = await tee.nextPublicExtensionId();
  for (let i = FIRST_PUBLIC_EXTENSION_ID; i < count; i++) {
    const sender = await tee.getTeeExtensionInstructionsSender(i);
    if (sender.toLowerCase() === ADDR.instructionSender.toLowerCase()) return i;
  }
  return 0n;
}

async function main() {
  console.log(`Chain: ${(await provider.getNetwork()).name ?? 'Coston2'} (${(await provider.getNetwork()).chainId})`);
  console.log(`Signer: ${wallet.address}`);
  console.log(`OrgId label: ${ORG_ID} -> ${toB32(ORG_ID)}`);
  console.log();

  // 0. Register the Sentinel extension in Flare's FCC TeeExtensionRegistry
  //    (extension registration is permissionless; only the TEE machine
  //    registration needs attestation from a real confidential TEE).
  console.log('--- Flare FCC extension registration ---');
  const tee = contracts.tee;
  const results = { extId: 0n, tx: {} };
  let extId = await findExtensionId(tee);
  if (extId > 0n) {
    console.log(`  extension already registered: ${extId} (sender match), skipping register()`);
  } else {
    try {
      extId = await tee.nextPublicExtensionId();
      results.tx.register = await sendTolerant('register(stateVerifier, instructionSender)', () =>
        tee.register(wallet.address, ADDR.instructionSender));
    } catch (err) {
      const msg = err?.reason ?? err?.message ?? String(err);
      if (/already/i.test(msg)) {
        extId = await findExtensionId(tee);
        if (extId === 0n) throw new Error('register() reverted but sender has no extensionId: ' + msg);
      } else {
        throw err;
      }
    }
  }
  results.extId = extId;
  console.log(`  extensionId: ${extId}`);

  results.tx.addMachineOwners = await sendTolerant('addAllowedTeeMachineOwners', () =>
    tee.addAllowedTeeMachineOwners(extId, [wallet.address]));
  results.tx.addProjectOwners = await sendTolerant('addAllowedTeeWalletProjectOwners', () =>
    tee.addAllowedTeeWalletProjectOwners(extId, [wallet.address]));
  results.tx.setExtensionId = await sendTolerant('sender.setExtensionId()', () =>
    contracts.sender.setExtensionId());

  // 1. Organization
  console.log('--- OrganizationRegistry ---');
  results.tx.org = await send('createOrganization', () =>
    contracts.organization.createOrganization(toB32(ORG_ID), wallet.address, ORG_NAME));

  // 2. Policies (hash format matches backend policies.service computeHash)
  console.log('--- PolicyRegistry ---');
  const policies = [
    { id: 'deny-read-env', name: 'Deny .env reads', version: 1,
      target: { actionName: 'READ_FILE', resourcePattern: '\\.env$' },
      conditions: {}, controls: { allowed: false, approvalRequired: false, reasonRequired: false, auditRequired: true, runtimeAttestationRequired: false, flareVerificationRequired: false } },
    { id: 'approve-secret-access', name: 'Approve secret resolution', version: 1,
      target: { secretName: 'OPENAI_API_KEY' },
      conditions: {}, controls: { allowed: true, approvalRequired: true, reasonRequired: true, auditRequired: true, runtimeAttestationRequired: false, flareVerificationRequired: false } },
  ];
  const policyHashes = {};
  for (const p of policies) {
    const hash = sha256({ orgId: ORG_ID, policyId: p.id, version: p.version, target: p.target, conditions: p.conditions, controls: p.controls });
    policyHashes[p.id] = hash;
    results.tx[`policy_${p.id}`] = await send(`registerPolicy ${p.id}`, () =>
      contracts.policy.registerPolicy(toB32(ORG_ID), toB32(p.id), '0x' + hash, p.version));
    console.log(`    policyHash ${p.id}: 0x${hash}`);
  }

  // 3. Approval
  console.log('--- ApprovalRegistry ---');
  const approvalId = 'demo-approval-resolve-secret';
  const decisionHash = sha256({ approvalId, sessionId: SESSION_ID, action: 'RESOLVE_SECRET', resource: 'OPENAI_API_KEY', status: 'approved' });
  results.tx.approval = await send('recordApproval', () =>
    contracts.approval.recordApproval(toB32(approvalId), toB32(SESSION_ID), APPROVER, true, decisionHash));

  // 4. Audits (hash format matches backend audit.service create)
  console.log('--- AuditRegistry ---');
  const audits = [
    { action: 'FILE_READ', resource: '.env', decision: 'DENY', policyHash: policyHashes['deny-read-env'] },
    { action: 'RESOLVE_SECRET', resource: 'OPENAI_API_KEY', decision: 'APPROVED', policyHash: policyHashes['approve-secret-access'] },
    { action: 'DEPLOY_PRODUCTION', resource: 'my-app', decision: 'APPROVAL_REQUIRED', policyHash: '' },
  ];
  const auditHashes = [];
  for (const a of audits) {
    const ts = new Date().toISOString();
    const hash = sha256({
      orgId: ORG_ID, sessionId: SESSION_ID, action: a.action, resource: a.resource,
      decision: a.decision, timestamp: ts, policyHash: a.policyHash, riskLevel: 'high',
    });
    auditHashes.push({ hash, action: a.action });
    results.tx[`audit_${a.action}`] = await send(`recordAudit ${a.action}`, () =>
      contracts.audit.recordAudit('0x' + hash, toB32(ORG_ID), toB32('demo-project'), toB32(SESSION_ID), toB32(a.action)));
    console.log(`    auditHash ${a.action}: 0x${hash}`);
  }

  // 5. Verify everything back
  console.log('\n--- On-chain verification ---');
  const regSender = await tee.getTeeExtensionInstructionsSender(extId);
  console.log(`extension ${extId} sender: ${regSender} ${regSender.toLowerCase() === ADDR.instructionSender.toLowerCase() ? 'MATCH' : 'MISMATCH'}`);
  const orgId = await contracts.organization.getOrganizationByOwner(wallet.address);
  console.log(`organization for owner: ${orgId === toB32(ORG_ID) ? 'MATCH' : 'MISMATCH (' + orgId + ')'}`);
  for (const a of auditHashes) {
    const ok = await contracts.audit.verifyAudit('0x' + a.hash);
    console.log(`audit ${a.action}: verified=${ok}`);
  }
  const appr = await contracts.approval.verifyApproval(toB32(approvalId));
  console.log(`approval verified=${appr}`);

  console.log('\n--- Paste into SUBMISSION.md (replace the placeholder section) ---');
  const link = (t) => (t ? `[tx](https://coston2-explorer.flare.network/tx/${t})` : 'n/a');
  console.log(`- **FCC extension registration:** extensionId \`${results.extId}\` — ${link(results.tx.register)} (sender \`setExtensionId\` ${link(results.tx.setExtensionId)})`);
  console.log(`- **Organization \`${ORG_ID}\`:** ${link(results.tx.org)}`);
  for (const p of policies) console.log(`- **Policy \`${p.id}\`:** hash \`0x${policyHashes[p.id]}\` — ${link(results.tx[`policy_${p.id}`])}`);
  console.log(`- **Approval \`${approvalId}\`:** ${link(results.tx.approval)}`);
  for (const a of auditHashes) console.log(`- **Audit \`${a.action}\`:** hash \`0x${a.hash}\` — ${link(results.tx[`audit_${a.action}`])}`);
}

main().catch((e) => { console.error('FAILED:', e?.reason ?? e?.message ?? e); process.exit(1); });
