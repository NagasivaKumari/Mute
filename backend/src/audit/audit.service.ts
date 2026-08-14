import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';
import { sha256 } from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { FlareService } from '../flare/flare.service';
import { EventsGateway } from '../websocket/events.gateway';
import { RiskService } from '../risk/risk.service';

export interface CreateAuditDto {
  organizationId?: string;
  projectId?: string;
  agentId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  decision: string;
  policyId?: string;
  policyName?: string;
  policyVersion?: number;
  policyHash?: string;
  riskScore?: number;
  riskLevel?: string;
  riskReason?: string;
  secretReferences?: string[];
  event?: string;
  secretsFound?: number;
  secretsMasked?: number;
  secretsExposed?: number;
  agentName?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditModel: Model<AuditLogDocument>,
    private readonly flareService: FlareService,
    private readonly eventsGateway: EventsGateway,
    private readonly riskService: RiskService,
  ) {}

  async create(dto: CreateAuditDto) {
    const timestamp = new Date().toISOString();
    const risk = dto.riskLevel
      ? { level: dto.riskLevel, score: dto.riskScore, reason: dto.riskReason }
      : this.riskService.classify(dto.action);
    const hash = sha256({
      orgId: dto.organizationId ?? 'anonymous',
      sessionId: dto.sessionId ?? 'anonymous',
      action: dto.action,
      resource: dto.resource,
      decision: dto.decision,
      timestamp,
      policyHash: dto.policyHash ?? '',
      riskLevel: risk.level,
    });

    const entry = await this.auditModel.create({
      organizationId: dto.organizationId || undefined,
      projectId: dto.projectId || undefined,
      agentId: dto.agentId || undefined,
      sessionId: dto.sessionId || undefined,
      action: dto.action,
      resource: dto.resource,
      decision: dto.decision,
      policyId: dto.policyId,
      policyName: dto.policyName,
      policyVersion: dto.policyVersion,
      riskScore: risk.score ?? dto.riskScore,
      riskLevel: risk.level,
      riskReason: dto.riskReason ?? risk.reason,
      secretReferences: dto.secretReferences ?? [],
      event: dto.event,
      secretsFound: dto.secretsFound,
      secretsMasked: dto.secretsMasked,
      secretsExposed: dto.secretsExposed,
      agentName: dto.agentName,
      hash,
      timestamp: new Date(),
    });

    if (dto.organizationId) {
      this.eventsGateway.emitAuditCreated(dto.organizationId, {
        auditId: entry._id.toString(),
        action: dto.action,
        decision: dto.decision,
        riskLevel: dto.riskLevel,
      });

      this.flareService
        .anchorAudit(hash, dto.organizationId, dto.projectId!, dto.sessionId!, dto.decision)
        .then((txHash) => {
          if (txHash) {
            entry.flareTxHash = txHash;
            return entry.save();
          }
        })
        .catch((error) => {
          this.logger.error(`Audit Flare anchoring failed for ${hash}: ${error.message}`);
        });
    }

    return this.mapAudit(entry);
  }

  async search(
    orgId: string,
    filters: {
      projectId?: string;
      agentId?: string;
      decision?: string;
      event?: string;
      riskLevel?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const query: Record<string, unknown> = { organizationId: orgId };
    if (filters.projectId) query.projectId = filters.projectId;
    if (filters.agentId) query.agentId = filters.agentId;
    if (filters.decision) query.decision = filters.decision;
    if (filters.event) query.event = filters.event;
    if (filters.riskLevel) query.riskLevel = filters.riskLevel;
    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from)
        (query.timestamp as Record<string, Date>).$gte = new Date(filters.from);
      if (filters.to)
        (query.timestamp as Record<string, Date>).$lte = new Date(filters.to);
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.auditModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditModel.countDocuments(query).exec(),
    ]);

    return {
      items: items.map((e) => this.mapAudit(e)),
      total,
      page,
      limit,
    };
  }

  async getById(orgId: string, id: string) {
    const entry = await this.auditModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!entry) apiError(404, ErrorCode.NOT_FOUND, 'Audit entry not found');
    return this.mapAudit(entry);
  }

  async verify(orgId: string, auditId: string) {
    const entry = await this.auditModel
      .findOne({ _id: auditId, organizationId: orgId })
      .exec();
    if (!entry) apiError(404, ErrorCode.NOT_FOUND, 'Audit entry not found');

    const onChain = await this.flareService.verifyAudit(entry.hash);
    return {
      auditId: entry._id.toString(),
      hash: entry.hash,
      verified: onChain.verified,
      flareTxHash: entry.flareTxHash,
    };
  }

  private mapAudit(entry: AuditLogDocument) {
    return {
      id: toApiId(entry),
      organizationId: entry.organizationId?.toString(),
      projectId: entry.projectId?.toString(),
      agentId: entry.agentId?.toString(),
      sessionId: entry.sessionId?.toString(),
      action: entry.action,
      resource: entry.resource,
      decision: entry.decision,
      policyId: entry.policyId?.toString(),
      policyName: entry.policyName,
      policyVersion: entry.policyVersion,
      riskScore: entry.riskScore,
      riskLevel: entry.riskLevel,
      riskReason: entry.riskReason,
      secretReferences: entry.secretReferences,
      event: entry.event,
      secretsFound: entry.secretsFound,
      secretsMasked: entry.secretsMasked,
      secretsExposed: entry.secretsExposed,
      agentName: entry.agentName,
      hash: entry.hash,
      flareTxHash: entry.flareTxHash,
      timestamp: toApiDate(entry.timestamp)!,
    };
  }
}
