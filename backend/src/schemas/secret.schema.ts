import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SecretDocument = HydratedDocument<Secret>;

@Schema({ timestamps: true, collection: 'secrets' })
export class Secret {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  reference!: string;

  @Prop({
    enum: ['api_key', 'password', 'ssh_key', 'env_file', 'other'],
    default: 'other',
  })
  secretType!: string;

  @Prop({ enum: ['active', 'rotated', 'revoked', 'compromised'], default: 'active' })
  status!: string;

  @Prop()
  envKey?: string;

  @Prop()
  lastAccessedAt?: Date;

  @Prop({ enum: ['trusted', 'untrusted', 'pending_verification'], default: 'pending_verification' })
  trustState!: string;

  @Prop()
  flareTxHash?: string;

  @Prop()
  rotationPolicy?: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const SecretSchema = SchemaFactory.createForClass(Secret);
SecretSchema.index({ organizationId: 1, projectId: 1, name: 1 }, { unique: true });
