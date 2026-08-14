import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({ collection: 'sessions' })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Agent', required: true, index: true })
  agentId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ['active', 'closed', 'expired'], default: 'active' })
  status!: string;

  @Prop()
  policyVersion?: string;

  @Prop({ default: Date.now })
  startedAt!: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ type: Object })
  metadata?: { deviceName?: string; ipAddress?: string };
}

export const SessionSchema = SchemaFactory.createForClass(Session);
SessionSchema.index({ agentId: 1, status: 1 });
