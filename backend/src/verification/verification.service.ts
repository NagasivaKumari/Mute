import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ethers } from 'ethers';
import { sha256 } from '@sentinel/shared';
import { FlareService } from '../flare/flare.service';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { Approval, ApprovalDocument } from '../schemas/approval.schema';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { toApiId } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

export type VerificationReason =
  | 'VERIFIED'
  | 'OWNER_MISMATCH'
  | 'WALLET_NOT_LINKED'
  | 'BLOCKCHAIN_UNAVAILABLE';

export interface VerificationResult {
  entity: string;
  entityId: string;
  computedHash: string;
  onChain: boolean;
  verified: boolean;
  reason?: VerificationReason;
  flareTxHash?: string;
  explorer?: string;
}

export interface SecretVerificationResult {
  auditId: string;
  secretReference: string;
  secretExists: boolean;
  secretStatus: string;
  policyAllowed: boolean;
  policyName?: string;
  approvalRequired: boolean;
  approvalGranted?: boolean;
  approver?: string;
  runtimeValid: boolean;
  verified: boolean;
}

export interface VerificationSummary {
  organization: VerificationResult;
  policies: VerificationResult[];
  recentAudits: VerificationResult[];
  recentApprovals: VerificationResult[];
  overall: boolean;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly flareService: FlareService,
    @InjectModel(Policy.name) private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(AuditLog.name) private readonly auditModel: Model<AuditLogDocument>,
    @InjectModel(Approval.name) private readonly approvalModel: Model<ApprovalDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
  ) {}

  async verifyAuditEntry(orgId: string, auditId: string): Promise<VerificationResult> {
    const entry = await this.auditModel
      .findOne({ _id: auditId, organizationId: orgId })
      .exec();
    if (!entry) apiError(404, ErrorCode.NOT_FOUND, 'Audit entry not found');

    const computedHash = sha256({
      orgId: entry.organizationId!.toString(),
      sessionId: entry.sessionId?.toString() ?? '',
      action: entry.action,
      resource: entry.resource,
      decision: entry.decision,
      timestamp: entry.timestamp.toISOString(),
      policyHash: '',
      riskLevel: entry.riskLevel ?? 'low',
    });

    const verification = await this.flareService.verifyAudit(computedHash);
    const explorer = verification.onChain && entry!.flareTxHash
      ? `https://coston2-explorer.flare.network/tx/${entry!.flareTxHash}`
      : undefined;

    return {
      entity: 'audit',
      entityId: toApiId(entry!),
      computedHash,
      onChain: verification.onChain,
      verified: verification.verified,
      flareTxHash: entry!.flareTxHash,
      explorer,
    };
  }

  async verifyPolicyRecord(orgId: string, policyId: string): Promise<VerificationResult> {
    const policy = await this.policyModel
      .findOne({ _id: policyId, organizationId: orgId })
      .exec();
    if (!policy) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');

    const computedHash = sha256({
      orgId,
      policyId: policy!.name,
      version: policy!.version,
      target: policy!.target,
      conditions: policy!.conditions,
      controls: policy!.controls,
    });

    const verification = await this.flareService.verifyPolicy(
      orgId,
      policy!._id.toString(),
      computedHash,
    );

    const explorer = verification.onChain && policy!.flareTxHash
      ? `https://coston2-explorer.flare.network/tx/${policy!.flareTxHash}`
      : undefined;

    return {
      entity: 'policy',
      entityId: toApiId(policy!),
      computedHash,
      onChain: verification.onChain,
      verified: verification.verified,
      flareTxHash: policy!.flareTxHash,
      explorer,
    };
  }

  async verifyApprovalRecord(orgId: string, approvalId: string): Promise<VerificationResult> {
    const approval = await this.approvalModel
      .findOne({ _id: approvalId, organizationId: orgId })
      .exec();
    if (!approval) apiError(404, ErrorCode.NOT_FOUND, 'Approval not found');

    const computedHash = sha256({
      approvalId: approval!._id.toString(),
      action: approval!.action,
      resource: approval!.resource,
      status: approval!.status,
      resolvedAt: approval!.resolvedAt?.toISOString() ?? '',
    });

    const verification = await this.flareService.verifyApproval(
      approval!._id.toString(),
    );

    const explorer = verification.onChain && approval!.flareTxHash
      ? `https://coston2-explorer.flare.network/tx/${approval!.flareTxHash}`
      : undefined;

    return {
      entity: 'approval',
      entityId: toApiId(approval!),
      computedHash,
      onChain: verification.onChain,
      verified: verification.verified,
      flareTxHash: approval!.flareTxHash,
      explorer,
    };
  }

  async verifyOrganizationRecord(orgId: string): Promise<VerificationResult> {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');

    const chain = await this.flareService.verifyOrganization(orgId);

    let verified = false;
    let reason: VerificationReason = 'BLOCKCHAIN_UNAVAILABLE';

    if (chain.onChain) {
      const walletLinked =
        Boolean(org.walletConnected) &&
        Boolean(org.walletVerified) &&
        Boolean(org.walletAddress);
      if (!walletLinked) {
        // no linked (connected + verified) wallet → no on-chain owner to trust
        reason = 'WALLET_NOT_LINKED';
      } else if (org.walletRevokedAt) {
        // deactivated/expired ownership record — stale owner must never validate
        reason = 'OWNER_MISMATCH';
      } else if (!chain.owner) {
        // org exists on-chain but no owner readable → cannot be a valid owner
        reason = 'OWNER_MISMATCH';
      } else {
        try {
          const ownerMatches =
            ethers.getAddress(chain.owner) === ethers.getAddress(org.walletAddress!);
          if (ownerMatches) {
            verified = true;
            reason = 'VERIFIED';
          } else {
            reason = 'OWNER_MISMATCH';
          }
        } catch {
          reason = 'OWNER_MISMATCH';
        }
      }
    }

    return {
      entity: 'organization',
      entityId: toApiId(org),
      computedHash: org.flareOrgId ?? '',
      onChain: chain.onChain,
      verified,
      reason,
      flareTxHash: org.flareOrgId,
      explorer: chain.onChain && org.flareOrgId
        ? `https://coston2-explorer.flare.network/tx/${org.flareOrgId}`
        : undefined,
    };
  }

  async verifySecretResolution(orgId: string, auditId: string): Promise<SecretVerificationResult> {
    const entry = await this.auditModel
      .findOne({ _id: auditId, organizationId: orgId })
      .exec();
    if (!entry) apiError(404, ErrorCode.NOT_FOUND, 'Audit entry not found');

    const secretRefs = entry!.secretReferences ?? [];

    // Check if the audit had secret references
    if (secretRefs.length === 0) {
      return {
        auditId: entry!._id.toString(),
        secretReference: '',
        secretExists: false,
        secretStatus: 'none',
        policyAllowed: entry!.decision === 'allow',
        policyName: entry!.policyName,
        approvalRequired: entry!.decision === 'approval_required',
        runtimeValid: true,
        verified: false,
      };
    }

    const firstRef = secretRefs[0];

    // Check if a matching approval exists (for high-risk secret access)
    let approvalGranted: boolean | undefined;
    let approver: string | undefined;
    if (entry!.decision === 'approval_required' || entry!.decision === 'approved') {
      const approval = await this.approvalModel
        .findOne({
          organizationId: orgId,
          sessionId: entry!.sessionId,
          action: entry!.action,
          status: 'approved',
        })
        .exec();
      if (approval) {
        approvalGranted = true;
        approver = approval.resolvedBy?.toString();
      }
    }

    // Check if policy was modified after this audit (integrity check)
    let policyModifiedAfter = false;
    if (entry!.policyId) {
      const currentPolicy = await this.policyModel.findById(entry!.policyId).exec();
      if (currentPolicy && currentPolicy.policyHash !== entry!.policyHash) {
        policyModifiedAfter = true;
      }
    }

    return {
      auditId: entry!._id.toString(),
      secretReference: firstRef,
      secretExists: true, // ponytail: if it was resolved, it existed at time of execution
      secretStatus: 'active',
      policyAllowed: entry!.decision !== 'deny',
      policyName: entry!.policyName,
      approvalRequired: entry!.decision === 'approval_required',
      approvalGranted,
      approver,
      runtimeValid: true,
      verified: entry!.decision !== 'deny' && !policyModifiedAfter,
    };
  }

  async getVerificationSummary(orgId: string): Promise<VerificationSummary> {
    const [policies, recentAudits, recentApprovals] = await Promise.all([
      this.policyModel.find({ organizationId: orgId, enabled: true }).exec(),
      this.auditModel.find({ organizationId: orgId }).sort({ timestamp: -1 }).limit(10).exec(),
      this.approvalModel.find({ organizationId: orgId }).sort({ createdAt: -1 }).limit(10).exec(),
    ]);

    const orgVerification = await this.verifyOrganizationRecord(orgId);

    const policyVerifications = await Promise.all(
      policies.map((p) => this.verifyPolicyRecord(orgId, p._id.toString())),
    );

    const auditVerifications = await Promise.all(
      recentAudits.map((a) => this.verifyAuditEntry(orgId, a._id.toString())),
    );

    const approvalVerifications = await Promise.all(
      recentApprovals.map((a) => this.verifyApprovalRecord(orgId, a._id.toString())),
    );

    const allResults = [orgVerification, ...policyVerifications, ...auditVerifications, ...approvalVerifications];
    const overall = allResults.every((r) => r.verified || !r.onChain);

    return {
      organization: orgVerification,
      policies: policyVerifications,
      recentAudits: auditVerifications,
      recentApprovals: approvalVerifications,
      overall,
    };
  }
}
