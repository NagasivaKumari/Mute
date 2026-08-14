import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Approval, ApprovalDocument } from '../schemas/approval.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { APPROVAL_TIMEOUT_MS } from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { FlareService } from '../flare/flare.service';
import { sha256 } from '@sentinel/shared';
import { EventsGateway } from '../websocket/events.gateway';
import { RiskService } from '../risk/risk.service';

const ROLE_HIERARCHY: Record<string, number> = { owner: 3, admin: 2, member: 1 };

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    @InjectModel(Approval.name)
    private readonly approvalModel: Model< ApprovalDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly flareService: FlareService,
    private readonly eventsGateway: EventsGateway,
    private readonly riskService: RiskService,
  ) {}

  async create(params: {
    orgId: string;
    projectId: string;
    sessionId: string;
    agentId: string;
    requestedBy: string;
    action: string;
    resource: string;
    reason?: string;
    riskScore?: number;
    approver?: string;
  }) {
    const approval = await this.approvalModel.create({
      ...params,
      organizationId: params.orgId,
      status: 'pending',
      riskScore: params.riskScore ?? this.riskService.classify(params.action).score,
      expiresAt: new Date(Date.now() + APPROVAL_TIMEOUT_MS),
      createdAt: new Date(),
      requiredApprover: params.approver,
    });

    this.eventsGateway.emitApprovalCreated(params.orgId, {
      approvalId: approval._id.toString(),
      action: params.action,
      resource: params.resource,
      agentId: params.agentId,
    });

    return this.mapApproval(approval);
  }

  async list(orgId: string, status?: string) {
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (status) filter.status = status;
    const approvals = await this.approvalModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    return approvals.map((a) => this.mapApproval(a));
  }

  async getById(orgId: string, id: string) {
    const approval = await this.approvalModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!approval) apiError(404, ErrorCode.NOT_FOUND, 'Approval not found');
    return this.mapApproval(approval);
  }

  async approve(orgId: string, id: string, resolvedBy: string) {
    const approval = await this.approvalModel
      .findOne({ _id: id, organizationId: orgId, status: 'pending' })
      .exec();
    if (!approval) apiError(404, ErrorCode.NOT_FOUND, 'Pending approval not found');
    if (approval.expiresAt < new Date()) {
      approval.status = 'expired';
      await approval.save();
      apiError(408, ErrorCode.APPROVAL_TIMEOUT, 'Approval expired');
    }

    if (approval.requiredApprover) {
      const resolver = await this.userModel.findById(resolvedBy).exec();
      if (!resolver) apiError(404, ErrorCode.NOT_FOUND, 'User not found');
      const resolverLevel = ROLE_HIERARCHY[resolver.role] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[approval.requiredApprover] ?? 0;
      if (resolverLevel < requiredLevel) {
        apiError(403, ErrorCode.FORBIDDEN, `User role "${resolver.role}" insufficient; "${approval.requiredApprover}" required`);
      }
    }

    const resolvedAt = new Date();
    const decisionHash = sha256({
      approvalId: approval._id.toString(),
      action: approval.action,
      resource: approval.resource,
      status: 'approved',
      resolvedAt: resolvedAt.toISOString(),
    });

    // Approval requires synchronous Flare anchoring — no action proceeds without on-chain proof
    this.flareService.assertOnline();
    const txHash = await this.flareService.anchorApproval(
      approval._id.toString(),
      approval.sessionId.toString(),
      true,
      decisionHash,
    );
    if (!txHash) {
      throw new ServiceUnavailableException(
        'Approval requires Flare anchoring — cannot proceed',
      );
    }

    // Only update status after Flare confirms
    approval.status = 'approved';
    approval.resolvedBy = resolvedBy as unknown as ApprovalDocument['resolvedBy'];
    approval.resolvedAt = resolvedAt;
    approval.flareTxHash = txHash;
    await approval.save();

    this.eventsGateway.emitApprovalResolved(orgId, {
      approvalId: approval._id.toString(),
      status: 'approved',
    });

    return this.mapApproval(approval);
  }

  async reject(orgId: string, id: string, resolvedBy: string) {
    const approval = await this.approvalModel
      .findOne({ _id: id, organizationId: orgId, status: 'pending' })
      .exec();
    if (!approval) apiError(404, ErrorCode.NOT_FOUND, 'Pending approval not found');

    if (approval.requiredApprover) {
      const resolver = await this.userModel.findById(resolvedBy).exec();
      if (!resolver) apiError(404, ErrorCode.NOT_FOUND, 'User not found');
      const resolverLevel = ROLE_HIERARCHY[resolver.role] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[approval.requiredApprover] ?? 0;
      if (resolverLevel < requiredLevel) {
        apiError(403, ErrorCode.FORBIDDEN, `User role "${resolver.role}" insufficient; "${approval.requiredApprover}" required`);
      }
    }

    const resolvedAt = new Date();
    const decisionHash = sha256({
      approvalId: approval._id.toString(),
      action: approval.action,
      resource: approval.resource,
      status: 'rejected',
      resolvedAt: resolvedAt.toISOString(),
    });

    // Rejection requires synchronous Flare anchoring — complete on-chain record
    this.flareService.assertOnline();
    const txHash = await this.flareService.anchorApproval(
      approval._id.toString(),
      approval.sessionId.toString(),
      false,
      decisionHash,
    );
    if (!txHash) {
      throw new ServiceUnavailableException(
        'Rejection requires Flare anchoring — cannot proceed',
      );
    }

    // Only update status after Flare confirms
    approval.status = 'rejected';
    approval.resolvedBy = resolvedBy as unknown as ApprovalDocument['resolvedBy'];
    approval.resolvedAt = resolvedAt;
    approval.flareTxHash = txHash;
    await approval.save();

    this.eventsGateway.emitApprovalResolved(orgId, {
      approvalId: approval._id.toString(),
      status: 'rejected',
    });

    return this.mapApproval(approval);
  }

  private mapApproval(approval: ApprovalDocument) {
    return {
      id: toApiId(approval),
      organizationId: approval.organizationId.toString(),
      projectId: approval.projectId.toString(),
      sessionId: approval.sessionId.toString(),
      agentId: approval.agentId.toString(),
      requestedBy: approval.requestedBy.toString(),
      action: approval.action,
      resource: approval.resource,
      reason: approval.reason,
      status: approval.status,
      resolvedBy: approval.resolvedBy?.toString(),
      flareTxHash: approval.flareTxHash,
      expiresAt: toApiDate(approval.expiresAt)!,
      createdAt: toApiDate(approval.createdAt)!,
      resolvedAt: toApiDate(approval.resolvedAt),
      riskScore: approval.riskScore,
      requiredApprover: approval.requiredApprover,
    };
  }
}
