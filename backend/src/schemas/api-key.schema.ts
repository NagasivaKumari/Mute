import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ collection: 'api_keys' })
export class ApiKey {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  keyHash!: string;

  @Prop({ required: true })
  keyPrefix!: string;

  @Prop({ type: [String], default: ['runtime'] })
  permissions!: string[];

  @Prop()
  expiresAt?: Date;

  @Prop()
  lastUsedAt?: Date;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: false })
  revoked!: boolean;
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
