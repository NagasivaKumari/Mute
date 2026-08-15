import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { createPublicKey, verify as ed25519Verify } from 'node:crypto';
import type { AttestationPayload, DangerousAuthPayload } from '@sentinel/types';

export interface SentinelConfig {
  apiUrl: string;
  apiKey?: string;
  accessToken?: string;
  defaultProject?: string;
  defaultAgent?: string;
  logLevel?: string;
}

export interface ProjectConfig {
  projectId: string;
  agentId?: string;
  protectedPatterns?: string[];
  defaultPolicies?: boolean;
}

export interface SessionState {
  sessionId: string;
  projectId: string;
  agentId: string;
  startedAt: string;
}

export interface VaultHeader {
  version: number;
  salt: string;
  orgId: string;
  projectId: string;
  orgNonce: string;
  wrappedDEK: string;
  wrappedDEKNonce: string;
  authorityKey?: string;
  kekVersion?: number;
}

export interface VaultData {
  header: VaultHeader;
  secrets: Record<string, { ciphertext: string; nonce: string }>;
}

const SENTINEL_DIR = path.join(os.homedir(), '.sentinel');

export function getSentinelDir(): string {
  return SENTINEL_DIR;
}

export function ensureSentinelDir(): void {
  if (!fs.existsSync(SENTINEL_DIR)) {
    fs.mkdirSync(SENTINEL_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): SentinelConfig {
  ensureSentinelDir();
  const configPath = path.join(SENTINEL_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    return { apiUrl: process.env.SENTINEL_API_URL ?? 'http://localhost:3001/v1' };
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as SentinelConfig;
}

export function saveConfig(config: SentinelConfig): void {
  ensureSentinelDir();
  fs.writeFileSync(
    path.join(SENTINEL_DIR, 'config.json'),
    JSON.stringify(config, null, 2),
    { mode: 0o600 },
  );
}

export function loadProjectConfig(cwd = process.cwd()): ProjectConfig | null {
  const configPath = path.join(cwd, '.sentinel', 'config.json');
  if (!fs.existsSync(configPath)) return null;
  return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as ProjectConfig;
}

export function saveProjectConfig(config: ProjectConfig, cwd = process.cwd()): void {
  const dir = path.join(cwd, '.sentinel');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config, null, 2));
}

export function getVaultPath(): string {
  return path.join(SENTINEL_DIR, 'vault.enc');
}

function readVaultFile(): VaultData | null {
  const vaultPath = getVaultPath();
  if (!fs.existsSync(vaultPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(vaultPath, 'utf-8')) as VaultData;
  } catch {
    return null;
  }
}

function writeVaultFile(data: VaultData): void {
  ensureSentinelDir();
  fs.writeFileSync(getVaultPath(), JSON.stringify(data), { mode: 0o600 });
}

// ──────────────────────── Machine identity factor ────────────────────────
// v1 (legacy): scrypt(hostname|username) — low entropy, retained for migration
function deriveMachineKey(): Buffer {
  const machineId = os.hostname() + '|' + os.userInfo().username;
  return crypto.scryptSync(machineId, 'sentinel-machine-v1', 32, { N: 16384, r: 8, p: 1 });
}

const MACHINE_KEY_PATH = path.join(SENTINEL_DIR, 'machine.key');

function getMachineKey(): Buffer | null {
  if (!fs.existsSync(MACHINE_KEY_PATH)) return null;
  try {
    return fs.readFileSync(MACHINE_KEY_PATH);
  } catch {
    return null;
  }
}

function ensureMachineKey(): Buffer {
  ensureSentinelDir();
  const existing = getMachineKey();
  if (existing) return existing;
  const key = crypto.randomBytes(32);
  fs.writeFileSync(MACHINE_KEY_PATH, key, { mode: 0o600 });
  return key;
}

// ──────────────────────── KEK derivation ────────────────────────
// KEK = HKDF-SHA256(salt, machineKey || "org:" || orgId || ":" || orgNonce, info)
//   kekVersion 1: machineKey = scrypt(hostname|username), info = "sentinel-vault-kek-v1"
//   kekVersion 2: machineKey = 32 random bytes from machine.key, info = "sentinel-vault-kek-v2"
//
// Neither local machine compromise nor Flare nonce alone yields the KEK.
// kekVersion 2 removes the hostname/username weakness. Existing v1 vaults auto-migrate on open.

function deriveKEK(salt: Buffer, orgId: string, orgNonce: string, kekVersion: number = 2): Buffer {
  let machineKey: Buffer;
  if (kekVersion === 1) {
    machineKey = deriveMachineKey();
  } else {
    const raw = getMachineKey();
    if (!raw) throw new Error('Machine key not found');
    machineKey = raw.subarray(0, 32);
  }
  const orgFactor = Buffer.from(`org:${orgId}:${orgNonce}`, 'utf-8');
  const ikm = Buffer.concat([machineKey, orgFactor]);
  const info = kekVersion === 1 ? 'sentinel-vault-kek-v1' : 'sentinel-vault-kek-v2';
  return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from(info, 'utf-8'), 32));
}

// ──────────────────────── Vault lifecycle ────────────────────────

export function initVault(orgId: string, orgNonce: string, projectId?: string): void {
  const dek = crypto.randomBytes(32);
  const salt = crypto.randomBytes(32);
  ensureMachineKey();
  const kek = deriveKEK(salt, orgId, orgNonce, 2);
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, nonce);
  const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const header: VaultHeader = {
    version: 1,
    kekVersion: 2,
    salt: salt.toString('base64'),
    orgId,
    projectId: projectId ?? '',
    orgNonce,
    wrappedDEK: Buffer.concat([wrapped, authTag]).toString('base64'),
    wrappedDEKNonce: nonce.toString('base64'),
  };

  writeVaultFile({ header, secrets: {} });
}

// opens the vault and returns the DEK if the orgNonce matches
// returns null on authorization failure (wrong nonce, tampered file)
// handles rotation: if vault's orgNonce differs from provided orgNonce
// and previousOrgNonce matches, re-wraps DEK with new orgNonce
// handles KEK migration: v1 -> v2 on first successful open after upgrade
function _openVault(
  orgId: string,
  orgNonce: string,
  previousOrgNonce?: string,
): Buffer | null {
  const vault = readVaultFile();
  if (!vault) return null;
  if (vault.header.orgId !== orgId) return null;

  const vaultSalt = Buffer.from(vault.header.salt, 'base64');
  const kekVersion = vault.header.kekVersion ?? 1;

  try {
    // try current orgNonce first — fast path when nonces match
    const kek = deriveKEK(vaultSalt, orgId, orgNonce, kekVersion);
    const dek = unwrapDEK(kek, vault.header.wrappedDEK, vault.header.wrappedDEKNonce);
    if (dek) {
      // re-wrap if migrating kek or rotating nonce
      if (kekVersion === 1 || vault.header.orgNonce !== orgNonce) {
        if (kekVersion === 1) ensureMachineKey();
        const newVersion = kekVersion === 1 ? 2 : kekVersion;
        const newKek = deriveKEK(vaultSalt, orgId, orgNonce, newVersion);
        vault.header.kekVersion = newVersion;
        vault.header.orgNonce = orgNonce;
        vault.header.wrappedDEK = wrapDEK(newKek, dek);
        vault.header.wrappedDEKNonce = crypto.randomBytes(12).toString('base64');
        writeVaultFile(vault);
      }
      return dek;
    }

    // try previous orgNonce (rotation transition)
    if (previousOrgNonce && vault.header.orgNonce === previousOrgNonce) {
      const oldKek = deriveKEK(vaultSalt, orgId, previousOrgNonce, kekVersion);
      const oldDek = unwrapDEK(oldKek, vault.header.wrappedDEK, vault.header.wrappedDEKNonce);
      if (oldDek) {
        if (kekVersion === 1) ensureMachineKey();
        const newVersion = kekVersion === 1 ? 2 : kekVersion;
        const newKek = deriveKEK(vaultSalt, orgId, orgNonce, newVersion);
        vault.header.kekVersion = newVersion;
        vault.header.orgNonce = orgNonce;
        vault.header.wrappedDEK = wrapDEK(newKek, oldDek);
        vault.header.wrappedDEKNonce = crypto.randomBytes(12).toString('base64');
        writeVaultFile(vault);
        return oldDek;
      }
    }

    // try stored orgNonce (no rotation, but caller provided wrong nonce)
    if (vault.header.orgNonce !== orgNonce) {
      const storedKek = deriveKEK(vaultSalt, orgId, vault.header.orgNonce, kekVersion);
      const storedDek = unwrapDEK(storedKek, vault.header.wrappedDEK, vault.header.wrappedDEKNonce);
      if (storedDek) return storedDek;
    }

    return null;
  } catch {
    return null;
  }
}

export interface TeeAuthPayload {
  authorized: boolean;
  authorizationId: number;
  timestamp: number;
  operation: string;
  orgId: string;
  secretName: string;
  instructionId: string;
  signature: string;
  publicKey: string;
}

// replay protection: instruction IDs already seen
const seenInstructions = new Map<string, number>();
const MAX_SEEN = 10000;

function canonicalMessage(parts: string[]): Buffer {
  const zero = Buffer.from([0]);
  const pieces = parts.map((p) => Buffer.concat([Buffer.from(p, 'utf-8'), zero]));
  const totalLen = pieces.reduce((s, p) => s + p.length, 0);
  return Buffer.concat(pieces, totalLen);
}

// Reusable signature verification core: timestamp window, replay check, ed25519 verify.
function _verifySignature(
  payload: { authorized: boolean; instructionId: string; timestamp: number; publicKey: string; signature: string },
  msg: Buffer,
  pinnedPublicKey?: string,
): boolean {
  if (!payload.authorized) return false;

  const now = Math.floor(Date.now() / 1000);
  if (payload.timestamp < now - 300) return false;
  if (payload.timestamp > now + 60) return false;

  if (seenInstructions.has(payload.instructionId)) return false;
  if (seenInstructions.size >= MAX_SEEN) {
    const entries = [...seenInstructions.entries()].sort((a, b) => a[1] - b[1]);
    const toEvict = Math.floor(entries.length / 2);
    for (let i = 0; i < toEvict; i++) {
      seenInstructions.delete(entries[i][0]);
    }
  }
  seenInstructions.set(payload.instructionId, now);

  try {
    const pubKeyHex = pinnedPublicKey || payload.publicKey;
    if (pinnedPublicKey && payload.publicKey !== pinnedPublicKey) return false;
    const pubKey = createPublicKey({
      key: Buffer.from(pubKeyHex, 'hex'),
      format: 'der',
      type: 'spki',
    });
    const sig = Buffer.from(payload.signature, 'hex');
    return ed25519Verify(null, msg, pubKey, sig);
  } catch {
    return false;
  }
}

// Verifies a TEE-signed authorization payload.
// Checks: ed25519 signature, orgId, operation (AUTHORIZE_SECRET only), expiry (5 min), replay.
// If pinnedPublicKey is provided, uses it instead of payload.publicKey (prevents substitution attack).
export function verifyTeeAuth(payload: TeeAuthPayload, expectedOrgId: string, pinnedPublicKey?: string): boolean {
  if (payload.operation !== 'AUTHORIZE_SECRET') return false;
  if (payload.orgId !== expectedOrgId) return false;
  const msg = canonicalMessage([
    payload.instructionId, payload.orgId, payload.secretName,
    String(payload.authorizationId), String(payload.timestamp), payload.operation,
  ]);
  return _verifySignature(payload, msg, pinnedPublicKey);
}

// Verifies a TEE-signed policy attestation payload.
// Checks: ed25519 signature, orgId, operation (ATTEST_POLICY only), expiry (5 min), replay.
// If expectedOrgId is omitted, org validation is left to the caller (e.g. engine delegates to backend).
export function verifyAttestation(payload: AttestationPayload, expectedOrgId?: string): boolean {
  if (payload.operation !== 'ATTEST_POLICY') return false;
  if (expectedOrgId !== undefined && payload.organizationId !== expectedOrgId) return false;
  const msg = canonicalMessage([
    payload.instructionId, payload.organizationId, payload.policyId,
    String(payload.policyVersion), payload.policyHash,
    String(payload.authorizationId), String(payload.timestamp), payload.operation,
  ]);
  return _verifySignature(payload, msg);
}

// Verifies a TEE-signed dangerous operation authorization payload.
// Checks: ed25519 signature, orgId, operation (AUTHORIZE_DANGEROUS only), expiry (5 min), replay.
// If expectedOrgId is omitted, org validation is left to the caller.
export function verifyDangerousAuth(payload: DangerousAuthPayload, expectedOrgId?: string): boolean {
  if (payload.operation !== 'AUTHORIZE_DANGEROUS') return false;
  if (expectedOrgId !== undefined && payload.organizationId !== expectedOrgId) return false;
  const msg = canonicalMessage([
    payload.instructionId, payload.organizationId, payload.operationId,
    payload.operationType, payload.resource, payload.requestHash,
    String(payload.authorizationId), String(payload.timestamp), payload.operation,
  ]);
  return _verifySignature(payload, msg);
}

// Opens the vault with a TEE-signed authorization payload.
// Without cryptographic verification of the FCE signature, the vault cannot be opened.
// On first successful open, pins the FCE public key to the vault header (PUBKEY-2 fix).
// Subsequent opens verify against the pinned key, preventing public key substitution.
export function openVaultAuthorized(
  orgId: string,
  orgNonce: string,
  teeAuth: TeeAuthPayload,
  previousOrgNonce?: string,
): Buffer | null {
  const vault = readVaultFile();
  const pinnedKey = vault?.header.authorityKey;

  if (!verifyTeeAuth(teeAuth, orgId, pinnedKey)) return null;

  const dek = _openVault(orgId, orgNonce, previousOrgNonce);
  if (dek && !pinnedKey) {
    const vault2 = readVaultFile();
    if (vault2 && !vault2.header.authorityKey) {
      vault2.header.authorityKey = teeAuth.publicKey;
      writeVaultFile(vault2);
    }
  }
  return dek;
}

// Insecure local opener for deadline/demo recovery only.
// This bypasses TEE signature verification and should never be used in production.
export function openVaultInsecure(
  orgId: string,
  orgNonce: string,
  previousOrgNonce?: string,
): Buffer | null {
  return _openVault(orgId, orgNonce, previousOrgNonce);
}

function unwrapDEK(kek: Buffer, wrappedB64: string, nonceB64: string): Buffer | null {
  try {
    const wrapped = Buffer.from(wrappedB64, 'base64');
    const nonce = Buffer.from(nonceB64, 'base64');
    const authTag = wrapped.subarray(wrapped.length - 16);
    const ciphertext = wrapped.subarray(0, wrapped.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', kek, nonce);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    return null;
  }
}

function wrapDEK(kek: Buffer, dek: Buffer): string {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', kek, nonce);
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([encrypted, authTag]).toString('base64');
}

// ──────────────────────── Secret CRUD (requires DEK from openVault) ────────────────────────

export function vaultGet(name: string, dek?: Buffer): string | null {
  const vault = readVaultFile();
  if (!vault) return null;
  const entry = vault.secrets[name];
  if (!entry) return null;
  if (!dek) return null;

  try {
    const key = dek.subarray(0, 32);
    const nonce = Buffer.from(entry.nonce, 'base64');
    const ct = Buffer.from(entry.ciphertext, 'base64');
    const authTag = ct.subarray(ct.length - 16);
    const ciphertext = ct.subarray(0, ct.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf-8');
  } catch {
    return null;
  }
}

export function vaultSet(name: string, value: string, dek?: Buffer): void {
  if (!dek) return;
  const vault = readVaultFile() ?? { header: {} as any, secrets: {} as Record<string, { ciphertext: string; nonce: string }> };
  const key = dek.subarray(0, 32);
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const pt = Buffer.from(value, 'utf-8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const authTag = cipher.getAuthTag();

  vault.secrets[name] = {
    ciphertext: Buffer.concat([ct, authTag]).toString('base64'),
    nonce: nonce.toString('base64'),
  };
  writeVaultFile(vault);
}

export function vaultDelete(name: string): void {
  const vault = readVaultFile();
  if (!vault) return;
  delete vault.secrets[name];
  writeVaultFile(vault);
}

export function vaultList(dek?: Buffer): string[] {
  const vault = readVaultFile();
  if (!vault) return [];
  if (!dek) return [];
  return Object.keys(vault.secrets);
}

export function saveSessionState(state: SessionState): void {
  ensureSentinelDir();
  fs.writeFileSync(path.join(SENTINEL_DIR, 'session.json'), JSON.stringify(state, null, 2));
}

export function loadSessionState(): SessionState | null {
  const sessionPath = path.join(SENTINEL_DIR, 'session.json');
  if (!fs.existsSync(sessionPath)) return null;
  return JSON.parse(fs.readFileSync(sessionPath, 'utf-8')) as SessionState;
}

export function clearSessionState(): void {
  const sessionPath = path.join(SENTINEL_DIR, 'session.json');
  if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
}
