import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema({ timestamps: true, collection: 'organizations' })
export class Organization {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ enum: ['free', 'pro'], default: 'free' })
  plan!: string;

  @Prop({ enum: ['active', 'suspended'], default: 'active' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

  @Prop()
  flareOrgId?: string;

  @Prop()
  vaultNonce?: string;

  @Prop()
  walletAddress?: string;

  @Prop({ default: false })
  walletConnected?: boolean;

  @Prop({ default: false })
  walletVerified?: boolean;

  @Prop()
  walletNetwork?: string;

  @Prop()
  walletConnectedAt?: Date;

  @Prop()
  walletLastVerified?: Date;

  // ponytail: challenge nonce for EIP-191 ownership proof, never exposed via API
  @Prop()
  walletChallengeNonce?: string;

  @Prop()
  walletChallengeExpiresAt?: Date;

  // ponytail: deactivated/expired ownership record — set when the on-chain owner
  // is revoked (disconnect/rotate). Verification treats any revoked owner as invalid.
  @Prop()
  walletRevokedAt?: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
