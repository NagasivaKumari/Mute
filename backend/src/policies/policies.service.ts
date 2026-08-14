import { Injectable, forwardRef, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { CreatePolicyDto, UpdatePolicyDto } from './dto/policy.dto';
import { SYSTEM_POLICIES } from './system-policies';
import { sha256 } from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode, PolicyDecision } from '@sentinel/types';
import type { PolicyControls, PolicyConditions, PolicyTarget, PolicyCategory } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { FlareService } from '../flare/flare.service';

const DECISION_PRIORITY: Record<string, number> = {
  deny: 3,
  approval_required: 2,
  allow: 1,
};

const TYPE_TO_CATEGORY: Record<string, PolicyCategory> = {
  secret_access: 'secrets',
  environment: 'secrets',
  file: 'files',
  command: 'custom',
  database: 'database',
  infrastructure: 'infrastructure',
  deploy: 'deployment',
  git: 'git',
  network: 'network',
  custom: 'custom',
};

export interface EvaluationResult {
  decision: PolicyDecision;
  policy?: PolicyDocument;
  controls?: PolicyControls;
  reason?: string;
  metadata?: {
    reason: string;
    matchedConditions?: string[];
  };
}

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    @InjectModel(Policy.name) private readonly policyModel: Model<PolicyDocument>,
    @Inject(forwardRef(() => FlareService))
    private readonly flareService: FlareService,
  ) {}

  async seedSystemPolicies(orgId: string, userId: string) {
    const existing = await this.policyModel.countDocuments({ organizationId: orgId, isSystem: true }).exec();
    if (existing > 0) return;

    for (const tmpl of SYSTEM_POLICIES) {
      const policyHash = this.computeHash(
        orgId, tmpl.systemPolicyId, 1,
        tmpl.target as any, tmpl.conditions as any, tmpl.controls as any,
      );

      this.flareService.assertOnline();

      const policy = await this.policyModel.create({
        organizationId: orgId,
        name: tmpl.name,
        type: tmpl.type,
        category: tmpl.category,
        isSystem: true,
        systemPolicyId: tmpl.systemPolicyId,
        version: 1,
        enabled: true,
        target: tmpl.target,
        conditions: tmpl.conditions,
        controls: tmpl.controls,
        policyHash,
        createdBy: userId,
      });

      const txHash = await this.flareService.anchorPolicy(
        orgId, policy._id.toString(), policyHash, 1,
      ).catch(() => null);
      if (txHash) {
        policy.flareTxHash = txHash;
        await policy.save();
      }
    }

    this.logger.log(`Seeded ${SYSTEM_POLICIES.length} system policies for org ${orgId}`);
  }

  async create(orgId: string, userId: string, dto: CreatePolicyDto) {
    const policyHash = this.computeHash(orgId, dto.name, 1, dto.target as any, dto.conditions as any, dto.controls as any);

    this.flareService.assertOnline();

    const policy = await this.policyModel.create({
      organizationId: orgId,
      projectId: dto.projectId,
      name: dto.name,
      type: dto.type,
      category: dto.category ?? TYPE_TO_CATEGORY[dto.type] ?? 'custom',
      isSystem: false,
      version: 1,
      enabled: true,
      target: dto.target,
      conditions: dto.conditions,
      controls: dto.controls,
      policyHash,
      createdBy: userId,
    });

    const txHash = await this.flareService.anchorPolicy(
      orgId, policy._id.toString(), policyHash, 1,
    );
    if (!txHash) {
      await policy.deleteOne();
      throw new ServiceUnavailableException('Policy activation requires Flare — anchoring failed');
    }

    policy.flareTxHash = txHash;
    await policy.save();
    return this.mapPolicy(policy);
  }

  async list(orgId: string, projectId?: string, type?: string, category?: string) {
    const filter: Record<string, unknown> = { organizationId: orgId };
    if (projectId) {
      filter.$or = [{ projectId }, { projectId: null }];
    }
    if (type) filter.type = type;
    if (category) filter.category = category;
    const policies = await this.policyModel.find(filter).sort({ createdAt: -1 }).exec();
    return policies.map((p) => this.mapPolicy(p));
  }

  async getById(orgId: string, id: string) {
    const policy = await this.policyModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!policy) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');
    return this.mapPolicy(policy!);
  }

  async update(orgId: string, id: string, dto: UpdatePolicyDto) {
    const policy = await this.policyModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!policy) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');

    if (policy.isSystem) {
      if (dto.target) apiError(400, ErrorCode.VALIDATION_ERROR, 'System policy target cannot be modified. Clone the policy to customize.');
    }

    const hashChanged = Boolean(dto.name) || Boolean(dto.target) || Boolean(dto.conditions) || Boolean(dto.controls);

    if (dto.name) policy.name = dto.name;
    if (dto.enabled !== undefined) policy.enabled = dto.enabled;
    if (!policy.isSystem && dto.target) policy.target = { ...policy.target, ...dto.target } as any;
    if (dto.conditions) policy.conditions = { ...policy.conditions, ...dto.conditions } as any;
    if (dto.controls) policy.controls = { ...policy.controls, ...dto.controls } as any;

    if (hashChanged) {
      policy.version += 1;
      policy.policyHash = this.computeHash(
        orgId,
        policy.name,
        policy.version,
        policy.target,
        policy.conditions,
        policy.controls,
      );

      this.flareService.assertOnline();
      const txHash = await this.flareService.anchorPolicy(
        orgId, policy._id.toString(), policy.policyHash, policy.version,
      );
      if (!txHash) {
        throw new ServiceUnavailableException('Policy update requires Flare — anchoring failed');
      }
      policy.flareTxHash = txHash;
    }

    await policy.save();
    return this.mapPolicy(policy);
  }

  async clone(orgId: string, userId: string, id: string) {
    const source = await this.policyModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!source) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');

    const policyHash = this.computeHash(
      orgId, `${source.name} (Clone)`, 1,
      source.target, source.conditions, source.controls,
    );

    this.flareService.assertOnline();

    const policy = await this.policyModel.create({
      organizationId: orgId,
      projectId: source.projectId,
      name: `${source.name} (Clone)`,
      type: source.type,
      category: source.category,
      isSystem: false,
      version: 1,
      enabled: true,
      target: source.target,
      conditions: source.conditions,
      controls: source.controls,
      policyHash,
      createdBy: userId,
    });

    const txHash = await this.flareService.anchorPolicy(
      orgId, policy._id.toString(), policyHash, 1,
    );
    if (!txHash) {
      await policy.deleteOne();
      throw new ServiceUnavailableException('Policy clone requires Flare — anchoring failed');
    }

    policy.flareTxHash = txHash;
    await policy.save();
    return this.mapPolicy(policy);
  }

  async disable(orgId: string, id: string) {
    const policy = await this.policyModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!policy) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');
    policy.enabled = false;
    await policy.save();
    return this.mapPolicy(policy);
  }

  async verifyPolicyIntegrity(orgId: string, id: string): Promise<{ verified: boolean; onChain: boolean; computedHash: string }> {
    const policy = await this.policyModel.findOne({ _id: id, organizationId: orgId }).exec();
    if (!policy) apiError(404, ErrorCode.NOT_FOUND, 'Policy not found');
    const computed = this.computeHash(orgId, policy.name, policy.version, policy.target, policy.conditions, policy.controls);
    const result = await this.flareService.verifyPolicy(orgId, policy._id.toString(), computed);
    return { verified: result.verified, onChain: result.onChain, computedHash: computed };
  }

  // ──────────────────────── Policy Engine ────────────────────────

  evaluate(
    policies: PolicyDocument[],
    action: string,
    resource: string,
    context: { agentName?: string; environment?: string },
  ): EvaluationResult {
    let best: EvaluationResult | null = null;

    for (const policy of policies) {
      if (!policy.enabled) continue;
      if (!this.targetMatches(policy.type, policy.target, action, resource)) continue;
      
      const matchedConditions: string[] = [];
      if (!this.conditionsMatch(policy.conditions, context, matchedConditions)) continue;

      const controls = policy.controls;
      let decision: PolicyDecision;

      if (!controls.allowed) {
        decision = 'deny';
      } else if (controls.approvalRequired) {
        decision = 'approval_required';
      } else {
        decision = 'allow';
      }

      if (best === null || DECISION_PRIORITY[decision] > DECISION_PRIORITY[best.decision]) {
        best = {
          decision,
          policy,
          controls,
          reason: `Policy "${policy.name}" (${policy.type}) → ${decision}`,
          metadata: {
            reason: `Policy "${policy.name}" (${policy.type}) → ${decision}`,
            matchedConditions,
          },
        };
      }
    }

    if (best === null) {
      return { 
        decision: 'deny',
        reason: 'No matching policy — default deny',
        metadata: { reason: 'No matching policy — default deny' } 
      };
    }

    return best;
  }

  private targetMatches(type: string, target: PolicyTarget, action: string, resource: string): boolean {
    switch (type) {
      case 'secret_access':
        return target.secretName ? resource.includes(target.secretName) : false;
      case 'environment':
        return target.environmentName ? resource.includes(target.environmentName) : false;
      case 'deploy':
        return target.actionName ? action === target.actionName : false;
      case 'custom':
        if (target.actionName && target.resourcePattern) {
          try {
            return action === target.actionName && new RegExp(target.resourcePattern).test(resource);
          } catch { return false; }
        }
        return target.actionName ? action === target.actionName : false;
      default:
        // file, command, database, infrastructure, git, network
        if (target.actionName && action !== target.actionName) return false;
        if (target.resourcePattern) {
          try {
            return new RegExp(target.resourcePattern).test(resource);
          } catch { return false; }
        }
        return true;
    }
  }

  private conditionsMatch(
    conditions: PolicyConditions, 
    context: { agentName?: string; environment?: string },
    matchedConditions: string[]
  ): boolean {
    if (conditions.deniedAgents?.length && context.agentName) {
      if (conditions.deniedAgents.includes(context.agentName)) return false;
    }
    if (conditions.allowedAgents?.length && context.agentName) {
      if (!conditions.allowedAgents.includes(context.agentName)) {
        return false;
      } else {
        matchedConditions.push(`Agent "${context.agentName}" allowed`);
      }
    }
    if (conditions.deniedEnvironments?.length && context.environment) {
      if (conditions.deniedEnvironments.includes(context.environment)) return false;
    }
    if (conditions.allowedEnvironments?.length && context.environment) {
      if (!conditions.allowedEnvironments.includes(context.environment)) {
        return false;
      } else {
        matchedConditions.push(`Environment "${context.environment}" allowed`);
      }
    }
    return true;
  }

  // ──────────────────────── Hash ────────────────────────

  private computeHash(
    orgId: string,
    name: string,
    version: number,
    target: PolicyTarget,
    conditions: PolicyConditions,
    controls: PolicyControls,
  ): string {
    return sha256({ orgId, policyId: name, version, target, conditions, controls });
  }

  private mapPolicy(policy: PolicyDocument) {
    return {
      id: toApiId(policy),
      organizationId: policy.organizationId.toString(),
      projectId: policy.projectId?.toString(),
      name: policy.name,
      type: policy.type,
      category: policy.category,
      isSystem: policy.isSystem,
      systemPolicyId: policy.systemPolicyId,
      version: policy.version,
      enabled: policy.enabled,
      target: policy.target,
      conditions: policy.conditions,
      controls: policy.controls,
      policyHash: policy.policyHash,
      flareTxHash: policy.flareTxHash,
      createdBy: policy.createdBy.toString(),
      createdAt: toApiDate(policy.createdAt)!,
      updatedAt: toApiDate(policy.updatedAt)!,
    };
  }
}
