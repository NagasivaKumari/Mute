import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({
    enum: ['owner', 'admin', 'developer', 'security_auditor', 'viewer', 'member'],
    default: 'member',
  })
  role!: string;

  @Prop({ enum: ['active', 'invited', 'disabled'], default: 'active' })
  status!: string;

  @Prop()
  lastLogin?: Date;

  @Prop()
  refreshTokenHash?: string;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ organizationId: 1, email: 1 }, { unique: true });
