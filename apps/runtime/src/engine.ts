import * as crypto from 'node:crypto';
import { SentinelClient } from '@sentinel/sdk';
import type { EvaluateResponse } from '@sentinel/types';
import { verifyAttestation, verifyDangerousAuth, sha256 } from '@sentinel/shared';
import {
  loadProjectConfig,
  loadSessionState,
  vaultGet,
  initVault,
  openVaultAuthorized,
} from '@sentinel/shared';
import {
  executeCapability,
} from './capabilities/capability-executor';
import type { CapabilityRequest } from './capabilities/capability-executor';

export interface InterceptRequest {
  action: string;
  resource: string;
}

export interface InterceptResult {
  allowed: boolean;
  decision: string;
  approvalId?: string;
  reason?: string;
  secretValue?: string;
}

export class RuntimeEngine {
  private readonly client: SentinelClient;
  private dek: Buffer | null = null;
  private pendingApprovals = new Map<
    string,
    { resolve: (approved: boolean) => void; timeout: NodeJS.Timeout }
  >();

  // attestation cache: orgId:policyId:policyVersion:policyHash -> verified (until TTL expiry)
  private attestationCache = new Map<string, { verified: true; expiresAt: number }>();
  private static readonly ATTESTATION_TTL = 5 * 60 * 1000;
  private static readonly DEFAULT_CACHE_SIZE = 1000;
  private maxCacheSize: number;

  // Replay protection: engine-level seenInstructions, independent of shared module
  private engineSeenInstructions = new Map<string, number>();
  private static readonly MAX_SEEN = 10000;

  private static cacheKey(orgId: string, policyId: string, policyVersion: number, policyHash: string): string {
    return `${orgId}:${policyId}:${policyVersion}:${policyHash}`;
  }

  private checkReplay(instructionId: string): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (this.engineSeenInstructions.has(instructionId)) return false;
    if (this.engineSeenInstructions.size >= RuntimeEngine.MAX_SEEN) {
      const entries = [...this.engineSeenInstructions.entries()].sort((a, b) => a[1] - b[1]);
      const toEvict = Math.floor(entries.length / 2);
      for (let i = 0; i < toEvict; i++) {
        this.engineSeenInstructions.delete(entries[i][0]);
      }
    }
    this.engineSeenInstructions.set(instructionId, now);
    return true;
  }

  // Returns cached entry and updates LRU order (Map insertion order).
  private getCacheEntry(key: string): { verified: true; expiresAt: number } | undefined {
    const entry = this.attestationCache.get(key);
    if (entry) {
      this.attestationCache.delete(key);
      this.attestationCache.set(key, entry);
    }
    return entry;
  }

  private isAttestationCached(key: string): boolean {
    const entry = this.getCacheEntry(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.attestationCache.delete(key);
      return false;
    }
    return true;
  }

  // Insert with LRU tracking. Evicts expired entries first, then oldest, if over limit.
  private cacheAttestation(key: string): void {
    if (this.attestationCache.size >= this.maxCacheSize) {
      this.evictCache();
    }
    this.attestationCache.set(key, {
      verified: true,
      expiresAt: Date.now() + RuntimeEngine.ATTESTATION_TTL,
    });
  }

  private evictCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.attestationCache) {
      if (now > entry.expiresAt) {
        this.attestationCache.delete(key);
      }
    }
    while (this.attestationCache.size >= this.maxCacheSize) {
      const firstKey = this.attestationCache.keys().next().value;
      if (firstKey === undefined) break;
      this.attestationCache.delete(firstKey);
    }
  }

  constructor(client: SentinelClient, options?: { maxCacheSize?: number }) {
    this.client = client;
    this.maxCacheSize = options?.maxCacheSize ?? RuntimeEngine.DEFAULT_CACHE_SIZE;
    this.client.ws.on('approval:resolved', (payload) => {
      const event = payload as { approvalId: string; status: string };
      const pending = this.pendingApprovals.get(event.approvalId);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.resolve(event.status === 'approved');
        this.pendingApprovals.delete(event.approvalId);
      }
    });
  }

  async openVault(orgId: string): Promise<boolean> {
    try {
      const nonce = await this.client.runtime.getVaultNonce();
      if (!nonce?.orgNonce) return false;

      this.dek = openVaultAuthorized(
        orgId,
        nonce.orgNonce,
        nonce.teeAuth,
        nonce.previousOrgNonce ?? undefined,
      );

      if (!this.dek) {
        initVault(orgId, nonce.orgNonce);
        this.dek = openVaultAuthorized(orgId, nonce.orgNonce, nonce.teeAuth, nonce.previousOrgNonce ?? undefined);
      }

      return this.dek !== null;
    } catch {
      return false;
    }
  }

  async intercept(req: InterceptRequest): Promise<InterceptResult> {
    const session = loadSessionState();
    if (!session) {
      return { allowed: false, decision: 'deny', reason: 'No active session' };
    }

    const projectConfig = loadProjectConfig();
    if (!projectConfig) {
      return { allowed: false, decision: 'deny', reason: 'Project not initialized' };
    }

    try {
      const result = await this.client.runtime.evaluate({
        sessionId: session.sessionId,
        action: req.action,
        resource: req.resource,
        context: {
          agentId: session.agentId,
          projectId: session.projectId,
        },
      });

      // verify attestation before trusting any policy-based decision
      if (result.policyId && result.attestation) {
        // Finding 3: replay protection runs independently of cache (always, even on hit)
        if (!this.checkReplay(result.attestation.instructionId)) {
          return { allowed: false, decision: 'deny', reason: 'Replayed attestation instruction ID' };
        }

        // Finding 1: cache key binds orgId, policyId, policyVersion, policyHash
        const key = RuntimeEngine.cacheKey(
          result.attestation.organizationId,
          result.policyId,
          result.attestation.policyVersion,
          result.attestation.policyHash,
        );

        if (!this.isAttestationCached(key)) {
          // Cache miss: full verify.
          // Finding 4: engine has no independent orgId — org binding is the backend's responsibility.
          if (!verifyAttestation(result.attestation)) {
            return { allowed: false, decision: 'deny', reason: 'Policy attestation verification failed' };
          }
          this.cacheAttestation(key);
        }
        // Cache hit: skip ed25519 verify, replay already checked above.
      } else if (result.policyId && !result.attestation) {
        return { allowed: false, decision: 'deny', reason: 'Unsigned policy — no attestation provided' };
      }

      return this.handleDecision(result, req);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Evaluation failed';
      if (message.includes('denied') || message.includes('Denied')) {
        return { allowed: false, decision: 'deny', reason: message };
      }
      return { allowed: false, decision: 'deny', reason: 'Backend unavailable — fail secure' };
    }
  }

  async executeCapability(req: CapabilityRequest): Promise<import('./capabilities/capability-executor').CapabilityResult> {
    const session = loadSessionState();
    if (!session) {
      return { ok: false, error: 'No active session' };
    }

    const result = await this.intercept({
      action: req.action,
      resource: req.resource,
    });
    if (!result.allowed) {
      return { ok: false, error: result.reason ?? 'Capability denied by policy' };
    }

    // FCE authorization for dangerous operations
    const authOk = await this.authorizeDangerous(req);
    if (!authOk) {
      return { ok: false, error: 'FCE denied dangerous operation authorization' };
    }

    return executeCapability(req, this.dek ?? undefined);
  }

  // Request FCE authorization for a dangerous capability, verify, and cache.
  private async authorizeDangerous(req: CapabilityRequest): Promise<boolean> {
    const operationId = crypto.randomBytes(16).toString('hex');
    const requestHash = sha256({ action: req.action, resource: req.resource, params: req.params ?? {} });

    // Check cache first
    const cachePattern = `dangerous:${req.action}:${req.resource}:${requestHash}`;
    if (this.isAttestationCached(cachePattern)) {
      return true;
    }

    try {
      const auth = await this.client.runtime.authorizeDangerous({
        operationId,
        operationType: req.action,
        resource: req.resource,
        requestHash,
      });

      // Verify authorization payload
      if (!verifyDangerousAuth(auth)) return false;

      // Bind to the exact request fields
      if (auth.operationType !== req.action) return false;
      if (auth.resource !== req.resource) return false;
      if (auth.requestHash !== requestHash) return false;
      if (auth.operationId !== operationId) return false;

      this.cacheAttestation(cachePattern);
      return true;
    } catch {
      return false;
    }
  }

  async resolveSecret(reference: string, projectId: string): Promise<string | null> {
    const name = reference.replace('sentinel://secret/', '');
    const result = await this.intercept({
      action: 'READ_SECRET',
      resource: name,
    });
    if (!result.allowed) return null;

    try {
      const token = await this.client.secrets.requestAccess({
        projectId,
        secretName: name,
      });
      const localValue = vaultGet(name, this.dek ?? undefined);
      if (localValue) return localValue;
      return token.reference;
    } catch (err) {
      // ponytail: token issuance failed, but intercept() already approved — safe local read
      const localValue = vaultGet(name, this.dek ?? undefined);
      if (localValue) return localValue;
      return null;
    }
  }

  private async handleDecision(
    result: EvaluateResponse,
    req: InterceptRequest,
  ): Promise<InterceptResult> {
    if (result.decision === 'allow') {
      return {
        allowed: true,
        decision: 'allow',
        reason: result.reason,
      };
    }

    if (result.decision === 'deny') {
      return {
        allowed: false,
        decision: 'deny',
        reason: result.reason,
      };
    }

    if (result.decision === 'approval_required' && result.approvalId) {
      const approved = await this.waitForApproval(result.approvalId);
      if (approved) {
        let secretValue: string | undefined;
        if (req.action === 'READ_SECRET' || req.resource.includes('.env')) {
          secretValue = vaultGet(req.resource.replace('sentinel://secret/', ''), this.dek ?? undefined) ?? undefined;
        }
        return {
          allowed: true,
          decision: 'approved',
          approvalId: result.approvalId,
          reason: result.reason,
          secretValue,
        };
      }
      return {
        allowed: false,
        decision: 'rejected',
        approvalId: result.approvalId,
        reason: 'Approval rejected or timed out',
      };
    }

    return { allowed: false, decision: 'deny', reason: 'Unknown decision' };
  }

  private waitForApproval(approvalId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(approvalId);
        resolve(false);
      }, 5 * 60 * 1000);

      this.pendingApprovals.set(approvalId, { resolve, timeout });
    });
  }
}
