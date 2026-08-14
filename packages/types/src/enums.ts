export type UserRole =
  | 'owner'
  | 'admin'
  | 'developer'
  | 'security_auditor'
  | 'viewer'
  | 'member';

export type RuntimeType = 'cursor' | 'claude' | 'copilot' | 'cli' | 'custom';

export type Environment = 'development' | 'staging' | 'production';

export type AgentProvider = 'anthropic' | 'openai' | 'google' | 'local' | 'custom';

export type CapabilityMode = 'allow' | 'deny' | 'approval_required';

export type PolicyDecision = 'allow' | 'deny' | 'approval_required';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export type AuditDecision =
  | 'allow'
  | 'deny'
  | 'approval_required'
  | 'approved'
  | 'rejected';

export type SecretType = 'api_key' | 'password' | 'ssh_key' | 'env_file' | 'other';

export type RiskLevel = 'low' | 'medium' | 'high';

export type PolicyType =
  | 'secret_access'
  | 'environment'
  | 'file'
  | 'command'
  | 'database'
  | 'infrastructure'
  | 'deploy'
  | 'git'
  | 'network'
  | 'custom';

export type ApproverRole = 'owner' | 'security_team' | 'project_admin' | 'team_lead' | 'admin';

export type PolicyCategory =
  | 'secrets'
  | 'database'
  | 'infrastructure'
  | 'deployment'
  | 'git'
  | 'files'
  | 'network'
  | 'ai_agent'
  | 'cloud'
  | 'custom';

export enum RuntimeAction {
  READ_FILE = 'READ_FILE',
  WRITE_FILE = 'WRITE_FILE',
  DELETE_FILE = 'DELETE_FILE',
  EXEC_TERMINAL = 'EXEC_TERMINAL',
  GIT_PUSH = 'GIT_PUSH',
  GIT_COMMIT = 'GIT_COMMIT',
  READ_SECRET = 'READ_SECRET',
  NETWORK_REQUEST = 'NETWORK_REQUEST',
  DEPLOY = 'DEPLOY',
  RESOLVE_SECRET = 'RESOLVE_SECRET',
  CREATE_RESOURCE = 'CREATE_RESOURCE',
  MODIFY_CONFIG = 'MODIFY_CONFIG',
  INSTALL_DEPS = 'INSTALL_DEPS',
  RUN_TESTS = 'RUN_TESTS',
  BUILD = 'BUILD',
  GENERATE_CODE = 'GENERATE_CODE',
}

export enum ErrorCode {
  AUTH_FAILED = 'AUTH_FAILED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  POLICY_DENIED = 'POLICY_DENIED',
  CAPABILITY_DENIED = 'CAPABILITY_DENIED',
  APPROVAL_TIMEOUT = 'APPROVAL_TIMEOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  FLARE_OFFLINE = 'FLARE_OFFLINE',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
