import { Injectable, forwardRef, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'node:crypto';
import { Secret, SecretDocument } from '../schemas/secret.schema';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { Session, SessionDocument } from '../schemas/session.schema';
import { Agent, AgentDocument } from '../schemas/agent.schema';
import { Project, ProjectDocument } from '../schemas/project.schema';
import {
  RegisterSecretDto,
  RequestSecretDto,
  ValidateEnvDto,
  AddEnvVariableDto,
  RenameEnvVariableDto,
  RemoveEnvVariableDto,
} from './dto/secret.dto';
import {
  makeSecretReference,
  isSecretReference,
  parseSecretReference,
  SECRET_TOKEN_TTL_MS,
} from '@sentinel/shared';
import { toApiId, toApiDate } from '../common/utils/mapper.util';
import { ErrorCode } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { FlareService } from '../flare/flare.service';
import { PoliciesService } from '../policies/policies.service';

export interface SecretAccessToken {
  token: string;
  secretName: string;
  reference: string;
  expiresAt: string;
}

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly accessTokens = new Map<
    string,
    { secretId: string; orgId: string; expiresAt: number }
  >();

  constructor(
    @InjectModel(Secret.name) private readonly secretModel: Model<SecretDocument>,
    @InjectModel(Policy.name) private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(Session.name) private readonly sessionModel: Model<SessionDocument>,
    @InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    private readonly flareService: FlareService,
    @Inject(forwardRef(() => PoliciesService))
    private readonly policiesService: PoliciesService,
  ) {}

  async register(orgId: string, dto: RegisterSecretDto) {
    const reference = makeSecretReference(dto.name);
    const existing = await this.secretModel
      .findOne({ organizationId: orgId, projectId: dto.projectId, name: dto.name })
      .exec();
    if (existing) {
      return this.mapSecret(existing);
    }

    const secret = await this.secretModel.create({
      organizationId: orgId,
      projectId: dto.projectId,
      name: dto.name,
      reference,
      secretType: dto.secretType ?? 'other',
      status: 'active',
      envKey: dto.envKey,
      trustState: 'pending_verification',
    });
    return this.mapSecret(secret);
  }

  async list(orgId: string, projectId?: string) {
    const filter: Record<string, unknown> = { organizationId: orgId, status: 'active' };
    if (projectId) filter.projectId = projectId;
    const secrets = await this.secretModel.find(filter).sort({ createdAt: -1 }).exec();
    return secrets.map((s) => this.mapSecret(s));
  }

  async getById(orgId: string, id: string) {
    const secret = await this.secretModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!secret) apiError(404, ErrorCode.NOT_FOUND, 'Secret not found');
    return this.mapSecret(secret);
  }

  async getByName(orgId: string, projectId: string, name: string) {
    const secret = await this.secretModel
      .findOne({ organizationId: orgId, projectId, name, status: 'active' })
      .exec();
    if (!secret) apiError(404, ErrorCode.NOT_FOUND, `Secret "${name}" not found`);
    return this.mapSecret(secret);
  }

  async requestAccess(
    orgId: string,
    dto: RequestSecretDto,
  ): Promise<SecretAccessToken> {
    const secret = await this.getByName(orgId, dto.projectId, dto.secretName);

    // ── Policy gate: evaluate secret_access policies ──
    const session = await this.sessionModel.findOne({ _id: dto.sessionId, organizationId: orgId }).exec();
    const agent = session ? await this.agentModel.findById(session.agentId).exec() : null;
    const project = await this.projectModel.findById(dto.projectId).exec();

    const policies = await this.policyModel
      .find({
        organizationId: orgId,
        enabled: true,
        type: 'secret_access',
        $or: [{ projectId: dto.projectId }, { projectId: null }],
      })
      .exec();

    const { decision, policy, controls, reason } = this.policiesService.evaluate(
      policies,
      'RESOLVE_SECRET',
      dto.secretName,
      { agentName: agent?.name, environment: project?.environment },
    );

    if (decision === 'deny') {
      apiError(403, ErrorCode.POLICY_DENIED, reason ?? 'Secret access denied by policy');
    }

    if (policy && (controls?.flareVerificationRequired || controls?.verifiedPolicyRequired)) {
      const verification = await this.flareService.verifyPolicy(
        orgId,
        policy._id.toString(),
        policy.policyHash,
      );
      if (!verification.verified) {
        apiError(403, ErrorCode.POLICY_DENIED,
          verification.onChain
            ? 'Secret policy integrity check failed — hash does not match Flare'
            : 'Flare unavailable — cannot verify secret policy');
      }
    }

    if (decision === 'approval_required') {
      apiError(403, ErrorCode.POLICY_DENIED,
        `Secret access requires approval from ${controls?.approver ?? 'an approver'} — use /runtime/resolve-secret instead`);
    }

    this.flareService.assertOnline();

    secret.lastAccessedAt = new Date() as any;
    await this.secretModel.findByIdAndUpdate(secret.id, {
      lastAccessedAt: secret.lastAccessedAt,
    });

    const token = `st_${crypto.randomBytes(32).toString('hex')}`;
    this.accessTokens.set(token, {
      secretId: secret.id,
      orgId,
      expiresAt: Date.now() + SECRET_TOKEN_TTL_MS,
    });

    return {
      token,
      secretName: secret.name,
      reference: secret.reference,
      expiresAt: new Date(Date.now() + SECRET_TOKEN_TTL_MS).toISOString(),
    };
  }

  validateAccessToken(token: string, orgId: string): string | null {
    const entry = this.accessTokens.get(token);
    if (!entry || entry.orgId !== orgId || entry.expiresAt < Date.now()) {
      this.accessTokens.delete(token);
      return null;
    }
    return entry.secretId;
  }

  async revoke(orgId: string, id: string) {
    const secret = await this.secretModel
      .findOne({ _id: id, organizationId: orgId })
      .exec();
    if (!secret) apiError(404, ErrorCode.NOT_FOUND, 'Secret not found');
    secret.status = 'revoked';
    await secret.save();
    return this.mapSecret(secret);
  }

  async validateEnv(orgId: string, dto: ValidateEnvDto) {
    const secrets = await this.secretModel
      .find({ organizationId: orgId, projectId: dto.projectId, status: 'active' })
      .exec();
    const secretNames = new Set(secrets.map((s) => s.name));
    const issues: string[] = [];
    const valid: string[] = [];

    for (const variable of dto.variables) {
      if (isSecretReference(variable.value)) {
        const name = parseSecretReference(variable.value);
        if (name && secretNames.has(name)) {
          valid.push(variable.key);
        } else {
          issues.push(`Missing secret reference: ${variable.value}`);
        }
      } else if (
        !variable.value.startsWith('sentinel://') &&
        /password|secret|key|token|api/i.test(variable.key)
      ) {
        issues.push(
          `Plaintext detected for "${variable.key}" — use sentinel://secret/ reference`,
        );
      } else {
        valid.push(variable.key);
      }
    }

    return {
      valid: issues.length === 0,
      validKeys: valid,
      issues,
      secretCount: secrets.length,
    };
  }

  async getEnvReferences(orgId: string, projectId: string) {
    const secrets = await this.secretModel
      .find({ organizationId: orgId, projectId, status: 'active' })
      .exec();
    return secrets.map((s) => ({
      key: s.envKey ?? s.name.toUpperCase(),
      value: s.reference,
      secretName: s.name,
      exists: true,
    }));
  }

  async addEnvVariable(orgId: string, dto: AddEnvVariableDto) {
    const secret = await this.register(orgId, {
      projectId: dto.projectId,
      name: dto.secretName,
      envKey: dto.key,
    });
    return {
      key: dto.key,
      value: secret.reference,
      secretName: secret.name,
    };
  }

  async renameEnvVariable(orgId: string, dto: RenameEnvVariableDto) {
    const secret = await this.secretModel
      .findOne({
        organizationId: orgId,
        projectId: dto.projectId,
        envKey: dto.oldKey,
        status: 'active',
      })
      .exec();
    if (!secret) {
      apiError(404, ErrorCode.NOT_FOUND, `Env variable "${dto.oldKey}" not found`);
    }
    secret.envKey = dto.newKey;
    await secret.save();
    return { oldKey: dto.oldKey, newKey: dto.newKey, reference: secret.reference };
  }

  async removeEnvVariable(orgId: string, dto: RemoveEnvVariableDto) {
    const secret = await this.secretModel
      .findOne({
        organizationId: orgId,
        projectId: dto.projectId,
        envKey: dto.key,
        status: 'active',
      })
      .exec();
    if (!secret) {
      apiError(404, ErrorCode.NOT_FOUND, `Env variable "${dto.key}" not found`);
    }
    secret.status = 'revoked';
    await secret.save();
    return { key: dto.key, removed: true };
  }

  private mapSecret(secret: SecretDocument) {
    return {
      id: toApiId(secret),
      organizationId: secret.organizationId.toString(),
      projectId: secret.projectId.toString(),
      name: secret.name,
      reference: secret.reference,
      secretType: secret.secretType,
      status: secret.status,
      envKey: secret.envKey,
      trustState: secret.trustState,
      flareTxHash: secret.flareTxHash,
      rotationPolicy: secret.rotationPolicy,
      lastAccessedAt: toApiDate(secret.lastAccessedAt),
      createdAt: toApiDate(secret.createdAt)!,
      updatedAt: toApiDate(secret.updatedAt)!,
    };
  }
}
