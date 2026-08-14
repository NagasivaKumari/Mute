import { Injectable, forwardRef, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EvaluateDto } from './dto/runtime.dto';
import { SessionsService } from '../sessions/sessions.service';
import { PoliciesService } from '../policies/policies.service';
import { ApprovalsService } from '../approvals/approvals.service';
import { AgentsService } from '../agents/agents.service';
import { AuditService } from '../audit/audit.service';
import { Policy, PolicyDocument } from '../schemas/policy.schema';
import { Project, ProjectDocument } from '../schemas/project.schema';
import { Secret, SecretDocument } from '../schemas/secret.schema';
import { ErrorCode, PolicyDecision } from '@sentinel/types';
import type { PolicyControls } from '@sentinel/types';
import { apiError } from '../common/filters/http-exception.filter';
import { FlareService } from '../flare/flare.service';
import { FceService } from '../fce/fce.service';
import { isSecretReference, parseSecretReference, verifyTeeAuth, verifyAttestation, verifyDangerousAuth } from '@sentinel/shared';
import type { TeeAuthPayload } from '@sentinel/shared';
import type { AttestationPayload, DangerousAuthPayload } from '@sentinel/types';
import { sha256 } from '@sentinel/shared';

@Injectable()
export class RuntimeService {
  private readonly logger = new Logger(RuntimeService.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly policiesService: PoliciesService,
    private readonly approvalsService: ApprovalsService,
    private readonly agentsService: AgentsService,
    private readonly auditService: AuditService,
    @InjectModel(Policy.name) private readonly policyModel: Model<PolicyDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Secret.name) private readonly secretModel: Model<SecretDocument>,
    @Inject(forwardRef(() => FlareService))
    private readonly flareService: FlareService,
    private readonly fceService: FceService,
    @InjectModel('Organization') private readonly orgModel: Model<any>,
  ) {}

  async evaluate(orgId: string, userId: string, dto: EvaluateDto) {
    const session = await this.sessionsService.getActive(orgId, dto.sessionId);
    const agent = await this.agentsService.getById(orgId, dto.context.agentId);
    const project = await this.projectModel.findOne({ _id: dto.context.projectId, organizationId: orgId }).exec();
    if (!project) apiError(404, ErrorCode.NOT_FOUND, 'Project not found');

    // 1. Check agent capability
    const capability = agent.capabilities.find((c) => c.name.toLowerCase() === dto.action.toLowerCase());
    if (capability?.mode === 'deny') {
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: dto.action,
        resource: dto.resource,
        decision: 'deny',
      });
      apiError(403, ErrorCode.CAPABILITY_DENIED, 'Agent capability denies this action');
    }

    // 2. Load policies
    const policies = await this.policyModel
      .find({
        organizationId: orgId,
        enabled: true,
        $or: [{ projectId: dto.context.projectId }, { projectId: null }],
      })
      .exec();

    // 3. Derive policy type from action
    const policyType = this.inferPolicyType(dto.action);

    // 4. Filter to relevant policies
    const relevant = policies.filter((p) => {
      if (p.type !== policyType && p.type !== 'custom') return false;
      if (p.type === 'secret_access') return false; // handled by resolve-secret flow
      return true;
    });

    // 5. Evaluate policies
    const { decision, policy, controls, reason } = this.policiesService.evaluate(
      relevant,
      dto.action,
      dto.resource,
      { agentName: agent.name, environment: project.environment },
    );

    // 6. Attest policy integrity via FCE — mandatory for any matched policy (never run unsigned)
    let attestation: AttestationPayload | undefined;
    if (policy) {
      try {
        attestation = await this.fceService.attestPolicy(
          orgId,
          policy._id.toString(),
          policy.policyHash,
          policy.version,
        );
        if (!verifyAttestation(attestation, orgId)) {
          this.logger.warn(`Attestation signature verification failed for policy ${policy._id}`);
          await this.auditService.create({
            organizationId: orgId,
            projectId: dto.context.projectId,
            agentId: dto.context.agentId,
            sessionId: dto.sessionId,
            action: dto.action,
            resource: dto.resource,
            decision: 'deny',
            policyId: policy._id.toString(),
            policyVersion: policy.version,
            policyHash: policy.policyHash,
            policyName: policy.name,
          });
          apiError(403, ErrorCode.POLICY_DENIED, 'Policy attestation verification failed');
        }
      } catch {
        apiError(503, ErrorCode.FLARE_OFFLINE, 'FCE unavailable — cannot attest policy without TEE');
      }
    }

    // 7. Handle deny
    if (decision === 'deny') {
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: dto.action,
        resource: dto.resource,
        decision: 'deny',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
      });
      apiError(403, ErrorCode.POLICY_DENIED, reason ?? 'Access denied by policy');
    }

    // 8. Handle approval required
    let approvalId: string | undefined;
    if (decision === 'approval_required') {
      const approval = await this.approvalsService.create({
        orgId,
        projectId: dto.context.projectId,
        sessionId: dto.sessionId,
        agentId: dto.context.agentId,
        requestedBy: userId,
        action: dto.action,
        resource: dto.resource,
        reason: reason,
        approver: controls?.approver,
      });
      approvalId = approval.id;

      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: dto.action,
        resource: dto.resource,
        decision: 'approval_required',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
      });
    } else {
      // 9. Auto-execute
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: dto.action,
        resource: dto.resource,
        decision: 'allow',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
      });
    }

    return {
      decision,
      policyId: policy?._id.toString(),
      policyVersion: policy?.version,
      policyName: policy?.name,
      policyType: policy?.type,
      approvalId,
      reason,
      controls: controls ?? { allowed: true, approvalRequired: false, reasonRequired: false, auditRequired: false, runtimeAttestationRequired: false, flareVerificationRequired: false },
      attestation,
    };
  }

  async resolveSecret(orgId: string, userId: string, dto: { sessionId: string; secretName: string; context: { agentId: string; projectId: string } }) {
    const session = await this.sessionsService.getActive(orgId, dto.sessionId);
    const agent = await this.agentsService.getById(orgId, dto.context.agentId);
    const project = await this.projectModel.findOne({ _id: dto.context.projectId, organizationId: orgId }).exec();
    if (!project) apiError(404, ErrorCode.NOT_FOUND, 'Project not found');

    // 1. Find the secret
    const secret = await this.secretModel.findOne({
      organizationId: orgId,
      projectId: dto.context.projectId,
      name: dto.secretName,
      status: 'active',
    }).exec();
    if (!secret) apiError(404, ErrorCode.NOT_FOUND, `Secret "${dto.secretName}" not found`);

    // 2. Find matching secret_access policy
    const policies = await this.policyModel
      .find({
        organizationId: orgId,
        enabled: true,
        type: 'secret_access',
        $or: [{ projectId: dto.context.projectId }, { projectId: null }],
      })
      .exec();

    const { decision, policy, controls, reason } = this.policiesService.evaluate(
      policies,
      'RESOLVE_SECRET',
      dto.secretName,
      { agentName: agent.name, environment: project.environment },
    );

    // 3. Verify policy on Flare if required
    if (policy && (controls?.flareVerificationRequired || controls?.verifiedPolicyRequired)) {
      const verification = await this.flareService.verifyPolicy(
        orgId,
        policy._id.toString(),
        policy.policyHash,
      );
      if (!verification.verified) {
        apiError(403, ErrorCode.POLICY_DENIED, 'Secret policy integrity check failed');
      }
    }

    // 4. Check approval if required
    let approvalId: string | undefined;
    if (decision === 'approval_required') {
      const approval = await this.approvalsService.create({
        orgId,
        projectId: dto.context.projectId,
        sessionId: dto.sessionId,
        agentId: dto.context.agentId,
        requestedBy: userId,
        action: 'RESOLVE_SECRET',
        resource: dto.secretName,
        reason: reason,
        approver: controls?.approver,
      });
      approvalId = approval.id;

      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: 'RESOLVE_SECRET',
        resource: dto.secretName,
        decision: 'approval_required',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
        secretReferences: [dto.secretName],
      });

      return { decision: 'approval_required', approvalId, secretName: dto.secretName };
    }

    if (decision === 'deny') {
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: 'RESOLVE_SECRET',
        resource: dto.secretName,
        decision: 'deny',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
        secretReferences: [dto.secretName],
      });
      apiError(403, ErrorCode.POLICY_DENIED, reason ?? 'Secret access denied by policy');
    }

    // 5. Get TEE authorization from FCE — FCC is essential, not decorative
    let teeAuth;
    try {
      teeAuth = await this.fceService.authorizeSecret(orgId, dto.secretName, {
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
      });
    } catch (err) {
      this.logger.error(`FCE authorizeSecret failed: ${err}`);
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: 'RESOLVE_SECRET',
        resource: dto.secretName,
        decision: 'deny',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
        secretReferences: [dto.secretName],
      });
      throw new ServiceUnavailableException('FCE unavailable — cannot authorize secret access without TEE');
    }

    if (!verifyTeeAuth(teeAuth, orgId)) {
      await this.auditService.create({
        organizationId: orgId,
        projectId: dto.context.projectId,
        agentId: dto.context.agentId,
        sessionId: dto.sessionId,
        action: 'RESOLVE_SECRET',
        resource: dto.secretName,
        decision: 'deny',
        policyId: policy?._id.toString(),
        policyVersion: policy?.version,
        policyHash: policy?.policyHash,
        policyName: policy?.name,
        secretReferences: [dto.secretName],
      });
      throw new ServiceUnavailableException('FCE authorization signature verification failed');
    }

    secret.lastAccessedAt = new Date();
    await secret.save();

    await this.auditService.create({
      organizationId: orgId,
      projectId: dto.context.projectId,
      agentId: dto.context.agentId,
      sessionId: dto.sessionId,
      action: 'RESOLVE_SECRET',
      resource: dto.secretName,
      decision: 'allow',
      policyId: policy?._id.toString(),
      policyVersion: policy?.version,
      policyHash: policy?.policyHash,
      policyName: policy?.name,
      secretReferences: [dto.secretName],
    });

    return {
      decision: 'allow',
      secretName: secret.name,
      reference: secret.reference,
      teeAuth,
    };
  }

  async getPolicies(orgId: string, projectId?: string) {
    return this.policiesService.list(orgId, projectId);
  }

  async getVaultNonce(orgId: string): Promise<{ orgNonce: string; previousOrgNonce: string | null; teeAuth: any } | null> {
    const org = await this.orgModel.findById(orgId).exec();
    if (!org?.vaultNonce) return null;

    let teeAuth;
    try {
      teeAuth = await this.fceService.authorizeSecret(orgId, '__VAULT_ACCESS__', {
        agentId: 'sentinel-engine',
        sessionId: 'vault-init',
      });
    } catch {
      throw new ServiceUnavailableException('FCE unavailable — vault access requires TEE authorization');
    }

    if (!verifyTeeAuth(teeAuth, orgId)) {
      throw new ServiceUnavailableException('FCE authorization signature verification failed');
    }

    return {
      orgNonce: org.vaultNonce,
      previousOrgNonce: null,
      teeAuth,
    };
  }

  async authorizeDangerous(
    orgId: string,
    operationId: string,
    operationType: string,
    resource: string,
    requestHash: string,
  ): Promise<DangerousAuthPayload> {
    const auth = await this.fceService.authorizeDangerousOperation(
      orgId, operationId, operationType, resource, requestHash,
    );

    if (!verifyDangerousAuth(auth, orgId)) {
      this.logger.warn(`Dangerous auth verification failed: ${operationType} on ${resource}`);
      throw new ServiceUnavailableException('FCE dangerous operation authorization verification failed');
    }

    return auth;
  }

  private inferPolicyType(action: string): string {
    const map: Record<string, string> = {
      READ_FILE: 'file', WRITE_FILE: 'file', DELETE_FILE: 'file',
      EXEC_TERMINAL: 'command',
      READ_SECRET: 'secret_access', RESOLVE_SECRET: 'secret_access',
      GIT_PUSH: 'git', GIT_COMMIT: 'git', GIT_STATUS: 'git', GIT_DIFF: 'git', GIT_LOG: 'git',
      DEPLOY: 'deploy', DEPLOY_PRODUCTION: 'deploy',
      NETWORK_REQUEST: 'network',
      CREATE_DATABASE: 'database', DROP_TABLE: 'database', DELETE_DATABASE: 'database',
      CREATE_RESOURCE: 'infrastructure', DESTROY_INFRA: 'infrastructure', RESTART_SERVICE: 'infrastructure',
      MODIFY_CONFIG: 'infrastructure', MODIFY_CI: 'infrastructure', MODIFY_CICD: 'infrastructure',
      INSTALL_DEPS: 'command', RUN_TESTS: 'command', BUILD: 'command', GENERATE_CODE: 'command',
      'CAPABILITY.DATABASE.CHECK_CONNECTIVITY': 'database',
      'CAPABILITY.DATABASE.QUERY': 'database',
      'CAPABILITY.DATABASE.LIST_TABLES': 'database',
      'CAPABILITY.DATABASE.GET_SCHEMA': 'database',
      'CAPABILITY.ENVIRONMENT.VALIDATE_CONFIG': 'environment',
      'CAPABILITY.ENVIRONMENT.LINT': 'environment',
      'CAPABILITY.ENVIRONMENT.CHECK': 'environment',
    };
    return map[action] ?? 'custom';
  }
}
