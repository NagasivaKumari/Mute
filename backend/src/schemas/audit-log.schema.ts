import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Organization', index: true })
  organizationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', index: true })
  projectId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Agent' })
  agentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session' })
  sessionId?: Types.ObjectId;

  @Prop({ required: true })
  action!: string;

  @Prop({ required: true })
  resource!: string;

  @Prop({ required: true })
  decision!: string;

  @Prop({ type: Types.ObjectId, ref: 'Policy' })
  policyId?: Types.ObjectId;

  @Prop()
  policyName?: string;

  @Prop()
  policyVersion?: number;

  @Prop()
  policyHash?: string;

  @Prop()
  riskScore?: number;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'low' })
  riskLevel?: string;

  @Prop()
  riskReason?: string;

  @Prop({ type: [String], default: [] })
  secretReferences?: string[];

  // ponytail: file-masking audit fields
  @Prop()
  event?: string;

  @Prop()
  secretsFound?: number;

  @Prop()
  secretsMasked?: number;

  @Prop()
  secretsExposed?: number;

  @Prop()
  agentName?: string;

  @Prop({ required: true, unique: true, index: true })
  hash!: string;

  @Prop()
  flareTxHash?: string;

  @Prop({ default: Date.now, index: true })
  timestamp!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ organizationId: 1, timestamp: -1 });
AuditLogSchema.index({ projectId: 1, timestamp: -1 });
AuditLogSchema.index({ riskLevel: 1, timestamp: -1 });
