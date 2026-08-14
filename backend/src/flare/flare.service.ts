import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import {
  PendingAnchor,
  PendingAnchorDocument,
} from '../schemas/pending-anchor.schema';
import { AuditLog } from '../schemas/audit-log.schema';

import AuditRegistryAbi from './contracts/AuditRegistry.json';
import PolicyRegistryAbi from './contracts/PolicyRegistry.json';
import ApprovalRegistryAbi from './contracts/ApprovalRegistry.json';
import OrganizationRegistryAbi from './contracts/OrganizationRegistry.json';
import AttestationRegistryAbi from './contracts/AttestationRegistry.json';

const FLARE_EXPLORER = 'https://coston2-explorer.flare.network/tx';

function toBytes32(value: string): string {
  return ethers.id(value);
}

interface CacheEntry {
  verified: boolean;
  timestamp: number;
}

export interface VerificationResult {
  verified: boolean;
  onChain: boolean;
}

@Injectable()
export class FlareService implements OnModuleInit {
  private readonly logger = new Logger(FlareService.name);
  private online = false;
  private provider!: ethers.JsonRpcProvider;
  private wallet!: ethers.Wallet;
  private auditRegistry!: ethers.Contract;
  private policyRegistry!: ethers.Contract;
  private approvalRegistry!: ethers.Contract;
  private organizationRegistry!: ethers.Contract;
  private attestationRegistry!: ethers.Contract;

  // ponytail: simple TTL cache, no LRU needed at this scale
  private verificationCache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private retryInterval?: ReturnType<typeof setInterval>;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(PendingAnchor.name)
    private readonly pendingAnchorModel: Model<PendingAnchorDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLog>,
  ) {}

  onModuleInit(): void {
    const privateKey = this.configService.get<string>('flare.privateKey');
    const rpcUrl = this.configService.get<string>('flare.rpcUrl');

    if (!privateKey || !rpcUrl) {
      this.logger.warn('Flare credentials not configured — anchoring queued only');
      return;
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    // ponytail: serialize nonces so concurrent anchors (audit+policy+retries)
    // never collide with "replacement fee too low" / "nonce too low"
    const signer = new ethers.NonceManager(this.wallet);

    const contracts = this.configService.get('flare.contracts');
    if (contracts?.auditRegistry) {
      this.auditRegistry = new ethers.Contract(
        contracts.auditRegistry,
        AuditRegistryAbi as ethers.InterfaceAbi,
        signer,
      );
    }
    if (contracts?.policyRegistry) {
      this.policyRegistry = new ethers.Contract(
        contracts.policyRegistry,
        PolicyRegistryAbi as ethers.InterfaceAbi,
        signer,
      );
    }
    if (contracts?.approvalRegistry) {
      this.approvalRegistry = new ethers.Contract(
        contracts.approvalRegistry,
        ApprovalRegistryAbi as ethers.InterfaceAbi,
        signer,
      );
    }
    if (contracts?.organizationRegistry) {
      this.organizationRegistry = new ethers.Contract(
        contracts.organizationRegistry,
        OrganizationRegistryAbi as ethers.InterfaceAbi,
        signer,
      );
    }
    if (contracts?.attestationRegistry) {
      this.attestationRegistry = new ethers.Contract(
        contracts.attestationRegistry,
        AttestationRegistryAbi as ethers.InterfaceAbi,
        signer,
      );
    }

    this.online = true;
    this.logger.log(`Flare service initialized — connected to ${rpcUrl}`);
    this.retryPendingAnchors();
    // ponytail: simple interval, no exponential backoff needed at hackathon scale
    this.retryInterval = setInterval(() => this.retryPendingAnchors(), 60_000);
    this.startHealthCheck();
  }

  getStatus() {
    return {
      online: this.online,
      network: 'flare-testnet',
      chainId: this.configService.get<number>('flare.chainId') ?? 114,
      contracts: this.configService.get('flare.contracts'),
      explorer: FLARE_EXPLORER,
    };
  }

  getWalletAddress(): string | undefined {
    return this.wallet?.address;
  }

  assertOnline(): void {
    if (!this.online) {
      throw new ServiceUnavailableException(
        'Flare network unavailable — privileged operations require Flare',
      );
    }
  }

  private startHealthCheck(): void {
    setInterval(async () => {
      try {
        await this.provider.getBlockNumber();
        if (!this.online) {
          this.logger.log('Flare connectivity restored');
        }
        this.online = true;
      } catch {
        if (this.online) {
          this.logger.warn('Flare connectivity lost');
        }
        this.online = false;
      }
    }, 30_000);
  }

  // ──────────────────────── Anchoring ────────────────────────

  async anchorOrganization(
    orgId: string,
    name: string,
  ): Promise<string | undefined> {
    if (!this.organizationRegistry) {
      this.logger.warn('OrganizationRegistry not deployed — queuing anchor');
      await this.queueAnchor('organization', orgId, { orgId, name });
      return undefined;
    }

    try {
      const orgIdBytes = toBytes32(orgId);
      const owner = this.wallet.address;
      const tx = await this.organizationRegistry.createOrganization(
        orgIdBytes,
        owner,
        name,
      );
      const receipt = await tx.wait();
      this.logger.log(`Organization anchored on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      this.logger.error(`Organization anchor failed: ${error}`);
      await this.queueAnchor('organization', orgId, { orgId, name });
      return undefined;
    }
  }

  async anchorWalletLink(
    orgId: string,
    walletAddress: string,
  ): Promise<string | undefined> {
    if (!this.organizationRegistry || !this.online) return undefined;
    try {
      const orgIdBytes = toBytes32(orgId);
      const tx = await this.organizationRegistry.updateOrganizationOwner(
        orgIdBytes,
        walletAddress,
      );
      const receipt = await tx.wait();
      this.logger.log(`Organization wallet linked on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      // ponytail: needs redeployed OrganizationRegistry with updateOrganizationOwner
      this.logger.warn(
        `On-chain wallet link failed (deployed contract may lack updateOrganizationOwner): ${error}`,
      );
      return undefined;
    }
  }

  async anchorWalletRevoke(
    orgId: string,
  ): Promise<string | undefined> {
    if (!this.organizationRegistry || !this.online) return undefined;
    try {
      const orgIdBytes = toBytes32(orgId);
      const tx = await this.organizationRegistry.revokeOrganizationOwner(orgIdBytes);
      const receipt = await tx.wait();
      this.logger.log(`Organization wallet owner revoked on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      // ponytail: needs redeployed OrganizationRegistry with revokeOrganizationOwner;
      // the DB revocation record (walletRevokedAt) still gates verification if this fails.
      this.logger.warn(
        `On-chain owner revoke failed (deployed contract may lack revokeOrganizationOwner): ${error}`,
      );
      return undefined;
    }
  }

  async anchorPolicy(
    orgId: string,
    policyId: string,
    policyHash: string,
    version: number,
  ): Promise<string | undefined> {
    if (!this.policyRegistry) {
      this.logger.warn('PolicyRegistry not deployed — queuing anchor');
      await this.queueAnchor('policy', policyHash, { orgId, policyId, policyHash, version });
      return undefined;
    }

    try {
      const orgIdBytes = toBytes32(orgId);
      const policyIdBytes = toBytes32(policyId);
      const hashBytes = policyHash.startsWith('0x')
        ? policyHash
        : '0x' + policyHash;

      const tx = await this.policyRegistry.registerPolicy(
        orgIdBytes,
        policyIdBytes,
        hashBytes,
        version,
      );
      const receipt = await tx.wait();
      this.logger.log(`Policy anchored on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      this.logger.error(`Policy anchor failed: ${error}`);
      await this.queueAnchor('policy', policyHash, { orgId, policyId, policyHash, version });
      return undefined;
    }
  }

  async anchorApproval(
    approvalId: string,
    sessionId: string,
    approved: boolean,
    decisionHash: string,
  ): Promise<string | undefined> {
    if (!this.approvalRegistry) {
      this.logger.warn('ApprovalRegistry not deployed — queuing anchor');
      await this.queueAnchor('approval', decisionHash, { approvalId, sessionId, approved, decisionHash });
      return undefined;
    }

    try {
      const approvalIdBytes = toBytes32(approvalId);
      const sessionIdBytes = toBytes32(sessionId);
      const approver = this.wallet.address;
      const hashBytes = decisionHash.startsWith('0x')
        ? decisionHash
        : '0x' + decisionHash;

      const tx = await this.approvalRegistry.recordApproval(
        approvalIdBytes,
        sessionIdBytes,
        approver,
        approved,
        hashBytes,
      );
      const receipt = await tx.wait();
      this.logger.log(`Approval anchored on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      this.logger.error(`Approval anchor failed: ${error}`);
      await this.queueAnchor('approval', decisionHash, { approvalId, sessionId, approved, decisionHash });
      return undefined;
    }
  }

  async anchorAudit(
    auditHash: string,
    orgId: string,
    projectId: string,
    sessionId: string,
    decision: string,
  ): Promise<string | undefined> {
    if (!this.auditRegistry) {
      this.logger.warn('AuditRegistry not deployed — queuing anchor');
      await this.queueAnchor('audit', auditHash, { auditHash, orgId, projectId, sessionId, decision });
      return undefined;
    }

    try {
      const auditHashBytes = auditHash.startsWith('0x')
        ? auditHash
        : '0x' + auditHash;
      const orgIdBytes = toBytes32(orgId);
      const projectIdBytes = toBytes32(projectId ?? 'anonymous');
      const sessionIdBytes = toBytes32(sessionId ?? 'anonymous');
      const actionBytes = toBytes32(decision ?? 'UNKNOWN');

      const tx = await this.auditRegistry.recordAudit(
        auditHashBytes,
        orgIdBytes,
        projectIdBytes,
        sessionIdBytes,
        actionBytes,
      );
      const receipt = await tx.wait();
      this.logger.log(`Audit anchored on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      this.logger.error(`Audit anchor failed: ${error}`);
      await this.queueAnchor('audit', auditHash, { auditHash, orgId, projectId, sessionId, decision });
      return undefined;
    }
  }

  async anchorAttestation(
    attestationId: string,
    runtimeHash: string,
    policyHash: string,
    extensionHash: string,
    cliHash: string,
  ): Promise<string | undefined> {
    if (!this.attestationRegistry) {
      this.logger.warn('AttestationRegistry not deployed — queuing anchor');
      await this.queueAnchor('attestation', attestationId, {
        attestationId, runtimeHash, policyHash, extensionHash, cliHash,
      });
      return undefined;
    }

    try {
      const idBytes = toBytes32(attestationId);
      const rtHash = runtimeHash.startsWith('0x') ? runtimeHash : '0x' + runtimeHash;
      const poHash = policyHash.startsWith('0x') ? policyHash : '0x' + policyHash;
      const exHash = extensionHash.startsWith('0x') ? extensionHash : '0x' + extensionHash;
      const clHash = cliHash.startsWith('0x') ? cliHash : '0x' + cliHash;

      const tx = await this.attestationRegistry.registerAttestation(
        idBytes, rtHash, poHash, exHash, clHash,
      );
      const receipt = await tx.wait();
      this.logger.log(`Attestation anchored on Flare: ${receipt.hash}`);
      return receipt.hash as string;
    } catch (error) {
      this.logger.error(`Attestation anchor failed: ${error}`);
      await this.queueAnchor('attestation', attestationId, {
        attestationId, runtimeHash, policyHash, extensionHash, cliHash,
      });
      return undefined;
    }
  }

  // ──────────────────────── Verification ────────────────────────

  private cacheKey(type: string, id: string): string {
    return `verify:${type}:${id}`;
  }

  private getCached(key: string): boolean | null {
    const entry = this.verificationCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.CACHE_TTL_MS) {
      this.verificationCache.delete(key);
      return null;
    }
    return entry.verified;
  }

  private setCache(key: string, verified: boolean): void {
    this.verificationCache.set(key, { verified, timestamp: Date.now() });
  }

  async verifyPolicy(
    orgId: string,
    policyId: string,
    expectedHash: string,
  ): Promise<VerificationResult> {
    const key = this.cacheKey('policy', `${orgId}:${policyId}:${expectedHash}`);
    const cached = this.getCached(key);
    if (cached !== null) return { verified: cached, onChain: this.online };

    if (!this.policyRegistry || !this.online) {
      return { verified: false, onChain: false };
    }

    try {
      const orgIdBytes = toBytes32(orgId);
      const policyIdBytes = toBytes32(policyId);
      const hashBytes = expectedHash.startsWith('0x')
        ? expectedHash
        : '0x' + expectedHash;

      const result: boolean = await this.policyRegistry.verifyPolicyHash(
        orgIdBytes,
        policyIdBytes,
        hashBytes,
      );
      this.setCache(key, result);
      return { verified: result, onChain: true };
    } catch {
      return { verified: false, onChain: true };
    }
  }

  async verifyApproval(
    approvalId: string,
  ): Promise<VerificationResult> {
    const key = this.cacheKey('approval', approvalId);
    const cached = this.getCached(key);
    if (cached !== null) return { verified: cached, onChain: this.online };

    if (!this.approvalRegistry || !this.online) {
      return { verified: false, onChain: false };
    }

    try {
      const idBytes = toBytes32(approvalId);
      const result: boolean = await this.approvalRegistry.verifyApproval(idBytes);
      this.setCache(key, result);
      return { verified: result, onChain: true };
    } catch {
      return { verified: false, onChain: true };
    }
  }

  async verifyAudit(
    auditHash: string,
  ): Promise<VerificationResult> {
    const key = this.cacheKey('audit', auditHash);
    const cached = this.getCached(key);
    if (cached !== null) return { verified: cached, onChain: this.online };

    // ponytail: if offline, check pending queue. If not pending AND not online,
    // we CANNOT confirm it was anchored — return false, not true.
    if (!this.auditRegistry || !this.online) {
      const pending = await this.pendingAnchorModel.findOne({ hash: auditHash }).exec();
      const result = !pending && this.online;
      if (this.online) this.setCache(key, result);
      return { verified: result, onChain: this.online };
    }

    try {
      const hashBytes = auditHash.startsWith('0x') ? auditHash : '0x' + auditHash;
      const result: boolean = await this.auditRegistry.verifyAudit(hashBytes);
      this.setCache(key, result);
      return { verified: result, onChain: true };
    } catch {
      return { verified: false, onChain: true };
    }
  }

  async verifyOrganization(
    orgId: string,
  ): Promise<{ onChain: boolean; owner?: string }> {
    // ponytail: no caching here — the on-chain owner is a live trust input;
    // a cached owner could be mistaken for current after a revoke/rotate.
    if (!this.organizationRegistry || !this.online) {
      return { onChain: false };
    }

    try {
      const orgIdBytes = toBytes32(orgId);
      const record = await this.organizationRegistry.getOrganization(orgIdBytes);
      const exists = record.createdAt !== 0n;
      return {
        onChain: true,
        owner: exists ? ethers.getAddress(record.owner) : undefined,
      };
    } catch {
      return { onChain: true };
    }
  }

  async verifyAttestation(
    attestationId: string,
  ): Promise<VerificationResult> {
    const key = this.cacheKey('attestation', attestationId);
    const cached = this.getCached(key);
    if (cached !== null) return { verified: cached, onChain: this.online };

    if (!this.attestationRegistry || !this.online) {
      return { verified: false, onChain: false };
    }

    try {
      const idBytes = toBytes32(attestationId);
      const result: boolean = await this.attestationRegistry.verifyAttestation(idBytes);
      this.setCache(key, result);
      return { verified: result, onChain: true };
    } catch {
      return { verified: false, onChain: true };
    }
  }

  async verifyHash(hash: string) {
    const pending = await this.pendingAnchorModel.findOne({ hash }).exec();
    return {
      hash,
      onChain: this.online && !pending,
      pending: Boolean(pending),
      explorer: pending ? undefined : `${FLARE_EXPLORER}/${hash}`,
    };
  }

  // ──────────────────────── Queue & Retry ────────────────────────

  private async queueAnchor(
    anchorType: string,
    hash: string,
    payload: Record<string, unknown>,
  ) {
    await this.pendingAnchorModel.updateOne(
      { hash, anchorType },
      { $setOnInsert: { payload, attempts: 0, createdAt: new Date() } },
      { upsert: true },
    );
    this.logger.warn(`Queued ${anchorType} anchor: ${hash}`);
  }

  private async retryPendingAnchors() {
    if (!this.online) return;
    const pending = await this.pendingAnchorModel.find({ attempts: { $lt: 5 } }).exec();
    for (const anchor of pending) {
      try {
        let txHash: string | undefined;
        switch (anchor.anchorType) {
          case 'audit': {
            const p = anchor.payload as Record<string, string>;
            txHash = await this.anchorAudit(p.auditHash, p.orgId, p.projectId, p.sessionId, p.decision);
            if (txHash) {
              await this.auditLogModel
                .updateOne({ hash: p.auditHash }, { $set: { flareTxHash: txHash } })
                .exec();
            }
            break;
          }
          case 'policy': {
            const p = anchor.payload as Record<string, string | number>;
            txHash = await this.anchorPolicy(
              p.orgId as string,
              p.policyId as string,
              p.policyHash as string,
              p.version as number,
            );
            break;
          }
          case 'approval': {
            const p = anchor.payload as Record<string, string | boolean>;
            txHash = await this.anchorApproval(
              p.approvalId as string,
              p.sessionId as string,
              p.approved as boolean,
              p.decisionHash as string,
            );
            break;
          }
          case 'organization': {
            const p = anchor.payload as Record<string, string>;
            txHash = await this.anchorOrganization(p.orgId, p.name);
            break;
          }
          case 'attestation': {
            const p = anchor.payload as Record<string, string>;
            txHash = await this.anchorAttestation(
              p.attestationId, p.runtimeHash, p.policyHash, p.extensionHash, p.cliHash,
            );
            break;
          }
        }
        if (txHash) {
          await anchor.deleteOne();
        } else {
          await this.pendingAnchorModel
            .updateOne({ _id: anchor._id }, { $inc: { attempts: 1 } })
            .exec();
        }
      } catch (error) {
        this.logger.error(`Retry ${anchor.anchorType} anchor failed: ${error}`);
        await this.pendingAnchorModel
          .updateOne({ _id: anchor._id }, { $inc: { attempts: 1 }, $set: { lastError: String(error) } })
          .exec();
      }
    }
  }
}
