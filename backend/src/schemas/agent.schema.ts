import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class AgentCapability {
  @Prop({ required: true })
  name!: string;

  @Prop({ enum: ['allow', 'deny', 'approval_required'], required: true })
  mode!: string;
}

@Schema({ collection: 'agents' })
export class Agent {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({
    enum: ['anthropic', 'openai', 'google', 'local', 'custom'],
    default: 'custom',
  })
  provider!: string;

  @Prop({ required: true })
  agentType!: string;

  @Prop()
  publicKey?: string;

  @Prop({ type: [AgentCapability], default: [] })
  capabilities!: AgentCapability[];

  @Prop({ enum: ['online', 'offline', 'revoked'], default: 'offline' })
  status!: string;

  @Prop()
  lastSeen?: Date;

  @Prop({ default: Date.now })
  registeredAt!: Date;
}

export type AgentDocument = HydratedDocument<Agent>;
export const AgentSchema = SchemaFactory.createForClass(Agent);
AgentSchema.index({ projectId: 1, status: 1 });
