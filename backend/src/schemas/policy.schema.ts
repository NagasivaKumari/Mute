import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { PolicyType, PolicyCategory, ApproverRole } from '@sentinel/types';

export type PolicyDocument = HydratedDocument<Policy>;

@Schema({ _id: false })
export class PolicyTarget {
  @Prop()
  secretName?: string;

  @Prop()
  actionName?: string;

  @Prop()
  resourcePattern?: string;

  @Prop()
  environmentName?: string;
}

@Schema({ _id: false })
export class PolicyConditions {
  @Prop({ type: [String] })
  allowedAgents?: string[];

  @Prop({ type: [String] })
  deniedAgents?: string[];

  @Prop({ type: [String] })
  allowedEnvironments?: string[];

  @Prop({ type: [String] })
  deniedEnvironments?: string[];
}

@Schema({ _id: false })
export class PolicyControls {
  @Prop({ required: true })
  allowed!: boolean;

  @Prop({ default: false })
  approvalRequired!: boolean;

  @Prop()
  approver?: string;

  @Prop({ default: false })
  reasonRequired!: boolean;

  @Prop({ default: false })
  auditRequired!: boolean;

  @Prop({ default: false })
  runtimeAttestationRequired!: boolean;

  @Prop({ default: false })
  flareVerificationRequired!: boolean;

  @Prop()
  verifiedPolicyRequired?: boolean;

  @Prop()
  temporaryAccessDuration?: number;
}

@Schema({ timestamps: true, collection: 'policies' })
export class Policy {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({
    type: String,
    enum: ['secret_access', 'environment', 'file', 'command', 'database', 'infrastructure', 'deploy', 'git', 'network', 'custom'],
    required: true,
  })
  type!: PolicyType;

  @Prop({
    type: String,
    enum: ['secrets', 'database', 'infrastructure', 'deployment', 'git', 'files', 'network', 'ai_agent', 'cloud', 'custom'],
    required: true,
    default: 'custom',
  })
  category!: PolicyCategory;

  @Prop({ default: false })
  isSystem!: boolean;

  @Prop()
  systemPolicyId?: string;

  @Prop({ default: 1 })
  version!: number;

  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ type: PolicyTarget, default: () => ({}) })
  target!: PolicyTarget;

  @Prop({ type: PolicyConditions, default: () => ({}) })
  conditions!: PolicyConditions;

  @Prop({ type: PolicyControls, required: true })
  controls!: PolicyControls;

  @Prop({ required: true })
  policyHash!: string;

  @Prop()
  flareTxHash?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy!: Types.ObjectId;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);
PolicySchema.index({ organizationId: 1, enabled: 1, type: 1 });
PolicySchema.index({ organizationId: 1, 'target.secretName': 1 });
PolicySchema.index({ organizationId: 1, 'target.actionName': 1 });
