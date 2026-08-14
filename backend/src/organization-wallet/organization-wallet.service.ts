import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'node:crypto';
import { ethers } from 'ethers';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { Approval, ApprovalDocument } from '../schemas/approval.schema';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { FlareService } from '../flare/flare.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class OrganizationWalletService {
  private readonly logger = new Logger(OrganizationWalletService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(Policy.name)
    private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(Approval.name)
    private readonly approvalModel: Model<ApprovalDocument>,
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
    private readonly configService: ConfigService,
    private readonly flareService: FlareService,
  ) {}

  async connect(orgId: string, address: string, user: AuthUser) {
    if (!ethers.isAddress(address)) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid wallet address');
    }
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    this.assertOwner(org, user);

    // M1 rotation: revoke the previous on-chain owner before registering a new one.
    // Never two active owners — the DB keeps exactly one current walletAddress.
    const hadVerifiedOwner =
      Boolean(org.walletConnected) &&
      Boolean(org.walletVerified) &&
      Boolean(org.walletAddress);
    if (hadVerifiedOwner) {
      org.walletRevokedAt = new Date();
      this.revokeOnChain(orgId);
    }

    // ponytail: connect overwrites an existing link (covers wallet rotation)
    org.walletAddress = ethers.getAddress(address);
    org.walletConnected = true;
    org.walletVerified = false;
    org.walletNetwork = String(this.configService.get<number>('flare.chainId') ?? 114);
    org.walletConnectedAt = new Date();
    org.walletChallengeNonce = crypto.randomBytes(16).toString('hex');
    org.walletChallengeExpiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await org.save();

    return {
      walletConnected: true,
      walletVerified: false,
      walletAddress: org.walletAddress,
      walletNetwork: org.walletNetwork,
      challenge: this.challengeMessage(orgId, org.walletChallengeNonce!),
    };
  }

  async verify(orgId: string, signature: string, user: AuthUser) {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    this.assertOwner(org, user);
    if (!org.walletConnected || !org.walletAddress || !org.walletChallengeNonce) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'No wallet pending verification');
    }
    if (!org.walletChallengeExpiresAt || org.walletChallengeExpiresAt < new Date()) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Challenge expired — reconnect the wallet');
    }

    const message = this.challengeMessage(orgId, org.walletChallengeNonce!);
    let recovered: string;
    try {
      recovered = ethers.verifyMessage(message, signature);
    } catch {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Invalid signature');
    }
    if (ethers.getAddress(recovered) !== ethers.getAddress(org.walletAddress!)) {
      apiError(400, ErrorCode.VALIDATION_ERROR, 'Signature does not match the connected wallet');
    }

    // L2: atomic guard — verification only commits if the wallet is still connected.
    // A concurrent disconnect invalidates this update and stale state cannot resurrect.
    const updated = await this.orgModel
      .findOneAndUpdate(
        { _id: orgId, walletConnected: true },
        {
          $set: {
            walletVerified: true,
            walletLastVerified: new Date(),
          },
          $unset: {
            walletChallengeNonce: '',
            walletChallengeExpiresAt: '',
            walletRevokedAt: '',
          },
        },
        { new: true },
      )
      .exec();
    if (!updated) {
      apiError(409, ErrorCode.VALIDATION_ERROR, 'Wallet was disconnected during verification');
    }

    // fire-and-forget: register the new wallet as on-chain owner
    this.flareService
      .anchorWalletLink(orgId, updated!.walletAddress!)
      .then((txHash) => this.logger.log(`Wallet link anchored: ${txHash}`))
      .catch(() => undefined);

    return this.mapWallet(updated!);
  }

  async disconnect(orgId: string, user: AuthUser) {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    this.assertOwner(org, user);

    // M1: record the ownership as deactivated/expired and attempt on-chain revoke.
    if (Boolean(org.walletConnected) && Boolean(org.walletAddress)) {
      org.walletRevokedAt = new Date();
      this.revokeOnChain(orgId);
    }

    org.walletAddress = undefined;
    org.walletConnected = false;
    org.walletVerified = false;
    org.walletNetwork = undefined;
    org.walletConnectedAt = undefined;
    org.walletLastVerified = undefined;
    org.walletChallengeNonce = undefined;
    org.walletChallengeExpiresAt = undefined;
    await org.save();

    return this.mapWallet(org);
  }

  async get(orgId: string) {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org) apiError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    return this.mapWallet(org);
  }

  // L1: role is necessary but not sufficient — the caller must BE the org owner.
  private assertOwner(org: OrganizationDocument, user: AuthUser): void {
    if (user.role !== 'owner' || org.ownerId?.toString() !== user.userId) {
      apiError(403, ErrorCode.FORBIDDEN, 'Only the organization owner can manage the wallet');
    }
  }

  private revokeOnChain(orgId: string): void {
    this.flareService
      .anchorWalletRevoke(orgId)
      .then((txHash) => this.logger.log(`Wallet owner revoked on-chain: ${txHash}`))
      .catch(() => undefined);
  }

  private challengeMessage(orgId: string, nonce: string): string {
    return `sentinel:verify-org:${orgId}:${nonce}`;
  }

  private async mapWallet(org: OrganizationDocument) {
    const [policiesAnchored, approvalsAnchored, auditsAnchored] = await Promise.all([
      this.policyModel.countDocuments({
        organizationId: org._id,
        flareTxHash: { $exists: true, $ne: null },
      }),
      this.approvalModel.countDocuments({
        organizationId: org._id,
        flareTxHash: { $exists: true, $ne: null },
      }),
      this.auditModel.countDocuments({
        organizationId: org._id,
        flareTxHash: { $exists: true, $ne: null },
      }),
    ]);

    return {
      walletConnected: Boolean(org.walletConnected),
      walletVerified: Boolean(org.walletVerified),
      walletAddress: org.walletAddress,
      walletNetwork: org.walletNetwork,
      walletConnectedAt: org.walletConnectedAt?.toISOString() ?? null,
      walletLastVerified: org.walletLastVerified?.toISOString() ?? null,
      trustAvailable: Boolean(org.walletConnected && org.walletVerified),
      pendingVerification: Boolean(org.walletConnected && !org.walletVerified),
      counts: { policiesAnchored, approvalsAnchored, auditsAnchored },
    };
  }
}
