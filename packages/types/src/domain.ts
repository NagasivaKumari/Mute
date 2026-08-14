import type { UserRole, RuntimeType, Environment, AgentProvider, CapabilityMode, PolicyDecision, ApprovalStatus, AuditDecision, SecretType, RiskLevel, PolicyType, PolicyCategory } from './enums';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro';
  status: 'active' | 'suspended';
  ownerId: string;
  flareOrgId?: string;
  walletAddress?: string;
  walletConnected?: boolean;
  walletVerified?: boolean;
  walletNetwork?: string;
  walletConnectedAt?: string | null;
  walletLastVerified?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationWallet {
  walletConnected: boolean;
  walletVerified: boolean;
  walletAddress?: string;
  walletNetwork?: string;
  walletConnectedAt?: string | null;
  walletLastVerified?: string | null;
  trustAvailable: boolean;
  pendingVerification: boolean;
  counts: {
    policiesAnchored: number;
    approvalsAnchored: number;
    auditsAnchored: number;
  };
  challenge?: string;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: 'active' | 'invited' | 'disabled';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  repositoryUrl?: string;
  defaultBranch?: string;
  runtimeType: RuntimeType;
  environment: Environment;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  provider: AgentProvider;
  agentType: string;
  capabilities: AgentCapability[];
  status: 'online' | 'offline' | 'revoked';
  lastSeen?: string;
  registeredAt: string;
}

export interface AgentCapability {
  name: string;
  mode: CapabilityMode;
}

export interface Session {
  id: string;
  organizationId: string;
  projectId: string;
  agentId: string;
  userId: string;
  status: 'active' | 'closed' | 'expired';
  policyVersion?: string;
  startedAt: string;
  endedAt?: string;
}

export interface PolicyTarget {
  secretName?: string;
  actionName?: string;
  resourcePattern?: string;
  environmentName?: string;
}

export interface PolicyConditions {
  allowedAgents?: string[];
  deniedAgents?: string[];
  allowedEnvironments?: string[];
  deniedEnvironments?: string[];
}

export interface PolicyControls {
  allowed: boolean;
  approvalRequired: boolean;
  approver?: string;
  reasonRequired: boolean;
  auditRequired: boolean;
  runtimeAttestationRequired: boolean;
  flareVerificationRequired: boolean;
  verifiedPolicyRequired?: boolean;
  temporaryAccessDuration?: number;
}

export interface Policy {
  id: string;
  organizationId: string;
  projectId?: string;
  name: string;
  type: PolicyType;
  category: PolicyCategory;
  isSystem: boolean;
  systemPolicyId?: string;
  version: number;
  enabled: boolean;
  target: PolicyTarget;
  conditions: PolicyConditions;
  controls: PolicyControls;
  policyHash: string;
  flareTxHash?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  organizationId: string;
  projectId: string;
  sessionId: string;
  agentId: string;
  requestedBy: string;
  action: string;
  resource: string;
  reason?: string;
  status: ApprovalStatus;
  resolvedBy?: string;
  flareTxHash?: string;
  expiresAt: string;
  createdAt: string;
  resolvedAt?: string;
  riskScore?: number;
  requiredApprover?: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  projectId: string;
  agentId: string;
  sessionId: string;
  action: string;
  resource: string;
  decision: AuditDecision;
  policyId?: string;
  policyVersion?: number;
  riskScore?: number;
  riskLevel?: RiskLevel;
  riskReason?: string;
  secretReferences?: string[];
  policyName?: string;
  hash: string;
  flareTxHash?: string;
  timestamp: string;
}

export interface SecretMetadata {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  reference?: string;
  secretType: SecretType;
  status: 'active' | 'rotated' | 'revoked' | 'compromised';
  trustState: 'trusted' | 'untrusted' | 'pending_verification';
  flareTxHash?: string;
  rotationPolicy?: string;
  lastAccessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface EvaluateRequest {
  sessionId: string;
  action: string;
  resource: string;
  context: {
    agentId: string;
    projectId: string;
  };
}

export interface AttestationPayload {
  authorized: boolean;
  instructionId: string;
  authorizationId: number;
  timestamp: number;
  organizationId: string;
  policyId: string;
  policyVersion: number;
  policyHash: string;
  operation: string;
  publicKey: string;
  signature: string;
}

export interface DangerousAuthPayload {
  authorized: boolean;
  instructionId: string;
  authorizationId: number;
  timestamp: number;
  organizationId: string;
  operationId: string;
  operationType: string;
  resource: string;
  requestHash: string;
  operation: string;
  publicKey: string;
  signature: string;
}

export interface EvaluateResponse {
  decision: PolicyDecision;
  policyId?: string;
  policyVersion?: number;
  policyName?: string;
  policyType?: PolicyType;
  approvalId?: string;
  reason?: string;
  controls: PolicyControls;
  secretReference?: string;
  attestation?: AttestationPayload;
}


